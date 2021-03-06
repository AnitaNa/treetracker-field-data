const BaseRepository = require("./BaseRepository");

class CaptureRepository extends BaseRepository {
    constructor(session) {
        super("capture", session);
        this._tableName = "capture";
        this._session = session;
    }

    async getByFilter(filterCriteria, options) {
        return await this._session.getDB()
        .where(filterCriteria)
        .select(
            'id',
            'reference_id',
            'image_url',
            'lat',
            'lon',
            'gps_accuracy',
            'planter_id',
            'planter_photo_url',
            'planter_username',
            'device_identifier',
            'note',
            'attributes',
            'status',
            'created_at',
            'updated_at'
        )
        .from('capture')
        .orderBy('created_at', 'desc')
        .limit(options.limit)
        .offset(options.offset);
    }

    async add(capture) {
        return await super.create(capture);
    }
}

class EventRepository extends BaseRepository {
    constructor(session) {
        super("domain_event", session);
        this._tableName = "domain_event";
        this._session = session;
    }

    async add(domainEvent) {
        return await super.create(domainEvent);
    }
}

module.exports = { 
    CaptureRepository,
    EventRepository,
}