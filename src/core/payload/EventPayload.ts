import { JSONObject, Logger } from '../../api';
import { Configuration } from '../config/Configuration';
import {
    defaultTimestampProvider,
    TimestampProvider,
} from '../provider/TimestampProvider';
import { lengthInUtf8Bytes } from '../utils/TextEncoderUtil';
import {
    APP_VERSION,
    DEVICE_MANUFACTURER,
    DEVICE_MODEL_IDENTIFIER,
    EVENT_KIND,
    EVENT_KIND_BIZ,
    EVENT_KIND_RUM,
    EVENT_PROVIDER,
    OS_NAME,
    TIMESTAMP,
} from './EventPayloadAttributes';

export class EventPayload {
    private readonly logger: Logger;

    constructor(
        private readonly config: Configuration,
        private readonly timestampProvider: TimestampProvider = defaultTimestampProvider,
    ) {
        this.logger = config.openKit.loggerFactory.createLogger('EventPayload');
    }

    public getBizEventsPayload(
        type: string,
        attributes: JSONObject,
        session: number,
    ): string {
        const internalAttributes = { ...attributes };

        this.addNonOverridableAttribute(internalAttributes, 'event.type', type);

        const sizePayload = lengthInUtf8Bytes(
            this.getJsonStringPayload(internalAttributes),
        );

        this.addBasicEventData(internalAttributes, session);

        this.addNonOverridableAttribute(
            internalAttributes,
            EVENT_KIND,
            EVENT_KIND_BIZ,
        );

        this.addNonOverridableAttribute(
            internalAttributes,
            'dt.rum.custom_attributes_size',
            sizePayload,
        );

        return this.getJsonStringPayload(internalAttributes);
    }

    public getCustomEventsPayload(
        name: string,
        attributes: JSONObject,
        session: number,
    ): string {
        const internalAttributes = { ...attributes };

        this.addBasicEventData(internalAttributes, session);

        this.addNonOverridableAttribute(internalAttributes, 'event.name', name);

        this.addOverridableAttribute(
            internalAttributes,
            EVENT_KIND,
            EVENT_KIND_RUM,
        );

        return this.getJsonStringPayload(internalAttributes);
    }

    private getJsonStringPayload(attributes: JSONObject): string {
        return JSON.stringify({ ...attributes }, (key, value) => {
            if (
                Number.isNaN(value) ||
                value === Infinity ||
                value === -Infinity
            ) {
                return;
            }

            return value;
        });
    }

    private addBasicEventData(attributes: JSONObject, session: number): void {
        this.removeReservedInternalAttributes(attributes);

        this.addOverridableAttribute(
            attributes,
            TIMESTAMP,
            this.timestampProvider.getCurrentTimestampNs(),
        );

        this.addNonOverridableAttribute(
            attributes,
            'dt.rum.schema_version',
            '1.1',
        );
        this.addNonOverridableAttribute(
            attributes,
            'dt.rum.application.id',
            this.config.openKit.applicationId,
        );
        this.addNonOverridableAttribute(
            attributes,
            'dt.rum.instance.id',
            this.config.openKit.deviceId,
        );
        this.addNonOverridableAttribute(
            attributes,
            'dt.rum.sid',
            session.toString(),
        );

        this.addOverridableAttribute(
            attributes,
            APP_VERSION,
            this.config.meta.applicationVersion,
        );
        this.addOverridableAttribute(
            attributes,
            OS_NAME,
            this.config.meta.operatingSystem,
        );
        this.addOverridableAttribute(
            attributes,
            DEVICE_MANUFACTURER,
            this.config.device.manufacturer,
        );
        this.addOverridableAttribute(
            attributes,
            DEVICE_MODEL_IDENTIFIER,
            this.config.device.modelId,
        );
        this.addOverridableAttribute(
            attributes,
            EVENT_PROVIDER,
            this.config.openKit.applicationId,
        );
    }

    private removeReservedInternalAttributes(attributes: JSONObject) {
        const jsonKeys = Object.keys(attributes);

        for (const key of jsonKeys) {
            if (key === 'dt' || key.startsWith('dt.')) {
                this.logger.warn(
                    'getEventsPayload',
                    'key name dt or dt. is reserved. Data will be removed!',
                    { key },
                );

                delete attributes[key];
            }
        }
    }

    private addOverridableAttribute(
        attributes: JSONObject,
        key: string,
        value?: string | number | boolean,
    ) {
        if (value !== undefined) {
            if (!(key in attributes)) {
                attributes[key] = value;
            }
        }
    }

    private addNonOverridableAttribute(
        attributes: JSONObject,
        key: string,
        value?: string | number | boolean,
    ) {
        if (value !== undefined) {
            if (key in attributes) {
                this.logger.warn(
                    'addAttribute',
                    `key ${key} is reserved. Custom data will be removed!`,
                    { key },
                );
            }

            attributes[key] = value;
        }
    }
}
