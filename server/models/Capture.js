const { raiseEvent, DomainEvent } = require('./DomainEvent');
const { Repository } = require('./Repository');

const Capture = ({ id, reference_id, image_url, lat, lon, planter_id, planter_username, attributes, status, created_at, updated_at }) => Object.freeze({
    id,
    reference_id,
    image_url,
    lat,
    lon,
    planter_id,
    planter_username,
    attributes,
    status,
    created_at,
    updated_at
});

const NewCapture = ({ id, reference_id, image_url, lat, lon, planter_id, planter_identifier, attributes }) => Object.freeze({
    id,
    reference_id,
    image_url,
    lat,
    lon,
    planter_id,
    planter_username: planter_identifier, //planter_identifier is legacy terminology, it represents the username of the planter, refactored to planterUsername
    status: 'unprocessed',
    attributes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
});


const FieldCaptureDataCreated = ({ id, lat, lon, planter_id, planter_identifier, attributes, created_at }) => Object.freeze({
    id,
    type: 'FieldDataCaptureCreated',
    lat,
    lon,
    planter_id,
    planter_username:planter_identifier,
    attributes,
    created_at, 
});

const VerifyCaptureProcessed = ({ id, reference_id, type, approved, rejection_reason, created_at }) => Object.freeze({
    id, 
    reference_id,
    type,
    approved,
    rejection_reason,
    created_at
});

const createCapture = (captureRepositoryImpl, eventRepositoryImpl) => (async (aNewCapture) => {

    // json wrap the 'attributes' array for storage in jsonb (storing array not suppported in jsonb)
    const newCapture = { 
        ...aNewCapture,
        attributes: { entries: aNewCapture.attributes }, 
    };
    const captureRepository = new Repository(captureRepositoryImpl);
    const capture = await captureRepository.add(newCapture);
    const filteredAttr = capture.attributes.entries
                            .filter(attribute => attribute.key === "app_flavor")
    const fieldDataCaptureCreated = FieldCaptureDataCreated({
        ...capture,
        attributes: filteredAttr
    });
    const raiseFieldDataEvent = raiseEvent(eventRepositoryImpl);
    const domainEvent = await raiseFieldDataEvent(DomainEvent(fieldDataCaptureCreated));
    return { entity: capture, raisedEvents: [domainEvent] };
});


const FilterCriteria = ({
     status = undefined,
     planter_username = undefined,
     planter_id = undefined
}) => {
    return Object.entries({ status, planter_username, planter_id })
    .filter(entry => entry[1] !== undefined)
    .reduce((result, item) => {
         result[item[0]] = item[1];
         return result;
    }, {});
}

const QueryOptions = ({
    limit = undefined,
    offset = undefined,
}) => {
    return Object.entries({ limit, offset })
    .filter(entry => entry[1] !== undefined)
    .reduce((result, item) => {
        result[item[0]] = item[1];
        return result;
    }, {});
}

const getCaptures = (captureRepositoryImpl) => (async (filterCriteria = undefined) => {
    let filter = {};
    let options = { limit: 1000, offset: 0 };
    if (filterCriteria !== undefined) {
        filter = FilterCriteria({ ...filterCriteria});
        options = { ...options, ...QueryOptions({ ...filterCriteria}) };
    }
    const captureRepository = new Repository(captureRepositoryImpl);
    const captures = await captureRepository.getByFilter(filter, options);
    return captures.map((row) => { return Capture({...row}); });
});


const applyVerification = (captureRepositoryImpl) => (async (verifyCaptureProcessed) => {
    if (verifyCaptureProcessed.approved) {
        await captureRepositoryImpl.update({ id: verifyCaptureProcessed.id, status: 'approved' });
    } else {
        await captureRepositoryImpl.update({
            id: verifyCaptureProcessed.id,
            status: 'rejected',
            rejection_reason: verifyCaptureProcessed.rejection_reason
        });
    }
});

module.exports = {
    NewCapture,
    createCapture,
    getCaptures,
    applyVerification
}