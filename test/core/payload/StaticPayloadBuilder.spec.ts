/*
 * Copyright 2019 Dynatrace LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CrashReportingLevel, DataCollectionLevel } from '../../../src/api';
import { Configuration, OpenKitConfiguration } from '../../../src/core/config/Configuration';
import { StaticPayloadBuilder } from '../../../src/core/payload/StaticPayloadBuilder';
import {
    agentTechnologyType,
    openKitVersion,
    platformTypeOpenKit,
    protocolVersion,
} from '../../../src/core/PlatformConstants';
import { EventType } from '../../../src/core/protocol/EventType';
import { PayloadKey } from '../../../src/core/protocol/PayloadKey';
import { PayloadDecoder } from '../../../src/core/utils/PayloadDecoder';
import { Mutable } from '../../Helpers';

const parse = (payload: string) => {
    const pairs = new PayloadDecoder(payload).getEntries();

    return {
        keys: Object.keys(pairs),
        pairs: pairs,
    }
};

const payloadExpect = (pairs: {[key: string]: string}, key: string, expected: string | undefined) => {
  expect(pairs[key]).toEqual(expected);
};

const payloadKeysExpect = (keys: string[], expected: PayloadKey[]) => {
    expect(keys.sort()).toEqual(expected.sort());
};

describe('PayloadBuilder', () => {
    describe('startSession', () => {
        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.startSession(5);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [PayloadKey.EventType, PayloadKey.ParentActionId, PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.ThreadId]);
            payloadExpect(pairs, PayloadKey.EventType, EventType.SessionStart.toString());
            payloadExpect(pairs, PayloadKey.ParentActionId, '0');
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, '5');
            payloadExpect(pairs, PayloadKey.Time0, '0');
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
        });
    });

    describe('endSession', () => {
        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.endSession(6000, 50000000);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [PayloadKey.EventType, PayloadKey.ParentActionId, PayloadKey.StartSequenceNumber, PayloadKey.ThreadId, PayloadKey.Time0]);
            payloadExpect(pairs, PayloadKey.EventType, EventType.SessionEnd.toString());
            payloadExpect(pairs, PayloadKey.ParentActionId, '0');
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, '6000');
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
            payloadExpect(pairs, PayloadKey.Time0, '50000000');
        });
    });

    describe('action', () => {
        const name = 'name';
        const id = 6;
        const sSN = 12345;
        const eSN = 98765;

        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.action(name, id, sSN, eSN, 420, 6000);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [
                PayloadKey.EventType, PayloadKey.KeyName, PayloadKey.ThreadId, PayloadKey.ActionId, PayloadKey.ParentActionId,
                PayloadKey.StartSequenceNumber, PayloadKey.EndSequenceNumber, PayloadKey.Time0, PayloadKey.Time1]);

            payloadExpect(pairs, PayloadKey.EventType, EventType.ManualAction.toString());
            payloadExpect(pairs, PayloadKey.KeyName, 'name');
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
            payloadExpect(pairs, PayloadKey.ActionId, '6');
            payloadExpect(pairs, PayloadKey.ParentActionId, '0');
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, '12345');
            payloadExpect(pairs, PayloadKey.EndSequenceNumber, '98765');
            payloadExpect(pairs, PayloadKey.Time0, '420');
            payloadExpect(pairs, PayloadKey.Time1, '6000');
        });
    });

    describe('applicationPrefix', () => {
        const dataCollectionLevel = DataCollectionLevel.UserBehavior;
        const crashReportingLevel = CrashReportingLevel.OptOutCrashes;

        const deviceId = '42';
        const applicationId = 'application-id';

        const applicationVersion = '1.2.3.4.5';
        const applicationName = 'My application name';

        const manufacturer = 'Dynatrace';
        const modelId = 'OpenKit';
        const screenHeight = 1900;
        const screenWidth = 4000;
        const userLanguage = 'de-AT';

        it('should build the correct payload with the maximum set of options', () => {
            // given
            const config: Mutable<Configuration | { openKit: Partial<OpenKitConfiguration> }> = {
                privacy: {
                    dataCollectionLevel,
                    crashReportingLevel,
                },
                openKit: {
                    deviceId,
                    applicationId,
                },
                meta: {
                    applicationName,
                    applicationVersion,
                },
                device: {
                    manufacturer,
                    modelId,
                    screenHeight,
                    screenWidth,
                    userLanguage,
                }
            };

            const payload = StaticPayloadBuilder.applicationWidePrefix(config as Configuration);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [
                PayloadKey.ProtocolVersion, PayloadKey.OpenKitVersion, PayloadKey.ApplicationId, PayloadKey.ApplicationName,
                PayloadKey.PlatformType, PayloadKey.AgentTechnologyType, PayloadKey.VisitorId, PayloadKey.DataCollectionLevel,
                PayloadKey.CrashReportingLevel, PayloadKey.DeviceManufacturer, PayloadKey.DeviceModel, PayloadKey.ScreenWidth,
                PayloadKey.ScreenHeight, PayloadKey.UserLanguage, PayloadKey.ApplicationVersion,
            ]);

            payloadExpect(pairs, PayloadKey.ProtocolVersion, protocolVersion.toString());
            payloadExpect(pairs, PayloadKey.OpenKitVersion, openKitVersion);
            payloadExpect(pairs, PayloadKey.ApplicationId, applicationId);
            payloadExpect(pairs, PayloadKey.PlatformType, platformTypeOpenKit.toString());
            payloadExpect(pairs, PayloadKey.AgentTechnologyType, agentTechnologyType);

            payloadExpect(pairs, PayloadKey.ApplicationName, applicationName);
            payloadExpect(pairs, PayloadKey.ApplicationVersion, applicationVersion);
            payloadExpect(pairs, PayloadKey.VisitorId, deviceId);

            payloadExpect(pairs, PayloadKey.DataCollectionLevel, dataCollectionLevel.toString());
            payloadExpect(pairs, PayloadKey.CrashReportingLevel, crashReportingLevel.toString());

            payloadExpect(pairs, PayloadKey.DeviceManufacturer, manufacturer);
            payloadExpect(pairs, PayloadKey.DeviceModel, modelId);
            payloadExpect(pairs, PayloadKey.ScreenWidth, screenWidth.toString());
            payloadExpect(pairs, PayloadKey.ScreenHeight, screenHeight.toString());
            payloadExpect(pairs, PayloadKey.UserLanguage, userLanguage);
        });

        it('should build the correct payload with the minimum set of options', () => {
            // given
            const config: Mutable<Configuration | { openKit: Partial<OpenKitConfiguration> }> = {
                privacy: {
                    dataCollectionLevel,
                    crashReportingLevel,
                },
                openKit: {
                    deviceId,
                    applicationId,
                },
                meta: {},
                device: {},
            };

            const payload = StaticPayloadBuilder.applicationWidePrefix(config as Configuration);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [
                PayloadKey.ProtocolVersion, PayloadKey.OpenKitVersion, PayloadKey.ApplicationId, PayloadKey.PlatformType,
                PayloadKey.AgentTechnologyType, PayloadKey.VisitorId, PayloadKey.DataCollectionLevel, PayloadKey.CrashReportingLevel,
                PayloadKey.ApplicationName,
            ]);

            payloadExpect(pairs, PayloadKey.ProtocolVersion, protocolVersion.toString());
            payloadExpect(pairs, PayloadKey.OpenKitVersion, openKitVersion);
            payloadExpect(pairs, PayloadKey.ApplicationId, applicationId);
            payloadExpect(pairs, PayloadKey.PlatformType, platformTypeOpenKit.toString());
            payloadExpect(pairs, PayloadKey.AgentTechnologyType, agentTechnologyType);

            payloadExpect(pairs, PayloadKey.ApplicationName, '');
            payloadExpect(pairs, PayloadKey.ApplicationVersion, undefined);
            payloadExpect(pairs, PayloadKey.VisitorId, deviceId);

            payloadExpect(pairs, PayloadKey.DataCollectionLevel, dataCollectionLevel.toString());
            payloadExpect(pairs, PayloadKey.CrashReportingLevel, crashReportingLevel.toString());

            payloadExpect(pairs, PayloadKey.DeviceManufacturer, undefined);
            payloadExpect(pairs, PayloadKey.DeviceModel, undefined);
            payloadExpect(pairs, PayloadKey.ScreenWidth, undefined);
            payloadExpect(pairs, PayloadKey.ScreenHeight, undefined);
            payloadExpect(pairs, PayloadKey.UserLanguage, undefined);
        });
    });

    describe('sessionPrefix', () => {
        const prefix = 'mock=prefix';
        const sessionId = 678;
        const clientIp = '';
        const sST = 7000;

        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.sessionPrefix(prefix, sessionId, clientIp, sST);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [PayloadKey.SessionNumber, PayloadKey.ClientIpAddress, PayloadKey.SessionStartTime, 'mock' as PayloadKey]);

            payloadExpect(pairs, PayloadKey.ClientIpAddress, '');
            payloadExpect(pairs, PayloadKey.SessionStartTime, sST.toString());
            payloadExpect(pairs, PayloadKey.SessionNumber, sessionId.toString());
        });
    });

    describe('mutable', () => {
        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.mutable(765, 98765);

            // when
            const {keys, pairs} = parse(payload);
            expect(keys.sort()).toEqual([PayloadKey.Multiplicity, PayloadKey.TransmissionTime].sort());
            payloadExpect(pairs, PayloadKey.Multiplicity, '765');
            payloadExpect(pairs, PayloadKey.TransmissionTime, '98765');
        });
    });

    describe('identifyUser', () => {
        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.identifyUser('Dynatrace Power User', 6, 60);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName, PayloadKey.ParentActionId, PayloadKey.StartSequenceNumber, PayloadKey.Time0]);

            payloadExpect(pairs, PayloadKey.EventType, EventType.IdentifyUser.toString());
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
            payloadExpect(pairs, PayloadKey.KeyName, 'Dynatrace Power User');
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, '6');
            payloadExpect(pairs, PayloadKey.ParentActionId, '0');
            payloadExpect(pairs, PayloadKey.Time0, '60');
        });
    });

    describe('reportError', () => {
        const name = 'error name';
        const pAId = 5;
        const sSN = 12345;
        const tSSS = 99000;
        const reason = 'i placed a bug';
        const ev = 400;

        it('should build the correct payload', () => {
            // given
            const payload = StaticPayloadBuilder.reportError(name, pAId, sSN, tSSS, reason, ev);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [
                PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName, PayloadKey.ParentActionId,
                PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.Reason, PayloadKey.ErrorValue]);

            payloadExpect(pairs, PayloadKey.EventType, EventType.Error.toString());
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
            payloadExpect(pairs, PayloadKey.KeyName, name);
            payloadExpect(pairs, PayloadKey.ParentActionId, pAId.toString());
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, sSN.toString());
            payloadExpect(pairs, PayloadKey.Time0, tSSS.toString());
            payloadExpect(pairs, PayloadKey.Reason, reason);
            payloadExpect(pairs, PayloadKey.ErrorValue, ev.toString());
        });
    });

    describe('reportValue', () => {
        const actionId = 7;
        const str250 = 'a'.repeat(250);

        it('should build a correct string-reportValue', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My String Value', 'Some String value', 6, 500);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [
                PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName, PayloadKey.ParentActionId,
                PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.Value]);

            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueString.toString());
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
            payloadExpect(pairs, PayloadKey.KeyName, 'My String Value');
            payloadExpect(pairs, PayloadKey.ParentActionId, '7');
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, '6');
            payloadExpect(pairs, PayloadKey.Time0, '500');
            payloadExpect(pairs, PayloadKey.Value, 'Some String value');
        });


        it('should build a correct double-reportValue', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', 456.321, 6, 500);

            // when
            const {keys, pairs} = parse(payload);

            // then
            payloadKeysExpect(keys, [PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName, PayloadKey.ParentActionId, PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.Value]);

            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueDouble.toString());
            payloadExpect(pairs, PayloadKey.ThreadId, '1');
            payloadExpect(pairs, PayloadKey.KeyName, 'My int value');
            payloadExpect(pairs, PayloadKey.ParentActionId, '7');
            payloadExpect(pairs, PayloadKey.StartSequenceNumber, '6');
            payloadExpect(pairs, PayloadKey.Time0, '500');
            payloadExpect(pairs, PayloadKey.Value, '456.321');
        });

        it('should build a correct double-reportValue with +Inf', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', +Infinity, 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.Value, 'Infinity');
        });

        it('should build a correct double-reportValue with -Inf', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', -Infinity, 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.Value, '-Infinity');
        });

        it('should build a correct double-reportValue with NaN', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', NaN, 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.Value, 'NaN');
        });

        it('should build a correct string-reportValue with empty-string', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', '', 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueString.toString());
            payloadExpect(pairs, PayloadKey.Value, '');
        });

        it('should build a correct string-reportValue with null', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', null, 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueString.toString());
            payloadExpect(pairs, PayloadKey.Value, undefined);
        });

        it('should build a correct string-reportValue with undefined', () => {
            // given
            const payload = StaticPayloadBuilder.reportValue(actionId, 'My int value', undefined, 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueString.toString());
            payloadExpect(pairs, PayloadKey.Value, undefined);
        });

        it('should truncate a key longer than 250 characters', () => {
            // given
            const str = str250 + 'z'; // 251 characters
            const payload = StaticPayloadBuilder.reportValue(actionId, str, '', 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueString.toString());
            payloadExpect(pairs, PayloadKey.KeyName, str250);
        });

        it('should truncate a value longer than 250 characters', () => {
            // given
            const str = str250 + 'z'; // 251 characters
            const payload = StaticPayloadBuilder.reportValue(actionId, 'Key', str, 6, 600);

            // when
            const {pairs} = parse(payload);

            // then
            payloadExpect(pairs, PayloadKey.EventType, EventType.ValueString.toString());
            payloadExpect(pairs, PayloadKey.Value, str250);
        });
    });

    describe('reportCrash', () => {
       it('should build the correct payload', () => {
           // given
          const payload = StaticPayloadBuilder.reportCrash('errorName', 'reason', 'stacktrace', 6, 4000);

           // when
           const {keys, pairs} = parse(payload);

           // then
           payloadKeysExpect(keys, [
               PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName, PayloadKey.ParentActionId,
               PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.Reason, PayloadKey.Stacktrace]);

          payloadExpect(pairs, PayloadKey.EventType, EventType.Crash.toString());
          payloadExpect(pairs, PayloadKey.ThreadId, '1');
          payloadExpect(pairs, PayloadKey.KeyName, 'errorName');
          payloadExpect(pairs, PayloadKey.ParentActionId, '0');
          payloadExpect(pairs, PayloadKey.StartSequenceNumber, '6');
          payloadExpect(pairs, PayloadKey.Time0, '4000');
          payloadExpect(pairs, PayloadKey.Reason, 'reason');
          payloadExpect(pairs, PayloadKey.Stacktrace, 'stacktrace');
       });
    });

    describe('reportEvent', () => {
       it('should build the payload', () => {
           // given
           const payload = StaticPayloadBuilder.reportNamedEvent('Name', 5, 8, 5431);

           // when
           const {keys, pairs} = parse(payload);

           // then
           payloadKeysExpect(keys, [
               PayloadKey.EventType, PayloadKey.KeyName, PayloadKey.ThreadId, PayloadKey.ParentActionId,
               PayloadKey.StartSequenceNumber, PayloadKey.Time0]);

           payloadExpect(pairs, PayloadKey.EventType, EventType.NamedEvent.toString());
           payloadExpect(pairs, PayloadKey.KeyName, 'Name');
           payloadExpect(pairs, PayloadKey.ThreadId, '1');
           payloadExpect(pairs, PayloadKey.ParentActionId, '5');
           payloadExpect(pairs, PayloadKey.StartSequenceNumber, '8');
           payloadExpect(pairs, PayloadKey.Time0, '5431');
       });
    });

    describe('webRequest', () => {
       it('should build the payload with all optional values', () => {
           // given
           const payload = StaticPayloadBuilder.webRequest('https://example.com', 70, 196, 500, 207, 5000, 1400, 5430, 200);

           // when
           const {keys, pairs} = parse(payload);

           // then
           payloadKeysExpect(keys, [
               PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName,
               PayloadKey.ParentActionId, PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.EndSequenceNumber,
               PayloadKey.Time1, PayloadKey.BytesSent, PayloadKey.BytesReceived, PayloadKey.ResponseCode]);

           payloadExpect(pairs, PayloadKey.EventType, EventType.WebRequest.toString());
           payloadExpect(pairs, PayloadKey.ThreadId, '1');
           payloadExpect(pairs, PayloadKey.KeyName, 'https://example.com');
           payloadExpect(pairs, PayloadKey.ParentActionId, '70');
           payloadExpect(pairs, PayloadKey.StartSequenceNumber, '196');
           payloadExpect(pairs, PayloadKey.Time0, '500');
           payloadExpect(pairs, PayloadKey.EndSequenceNumber, '207');
           payloadExpect(pairs, PayloadKey.Time1, '5000');
           payloadExpect(pairs, PayloadKey.BytesSent, '1400');
           payloadExpect(pairs, PayloadKey.BytesReceived, '5430');
           payloadExpect(pairs, PayloadKey.ResponseCode, '200');
       });

       it('should build the payload without optional values', () => {
           // given
           const payload = StaticPayloadBuilder.webRequest('https://example.com', 70, 196, 500, 207, 5000, -1, -1, -1);

           // when
           const {keys, pairs} = parse(payload);

           // then
           payloadKeysExpect(keys, [PayloadKey.EventType, PayloadKey.ThreadId, PayloadKey.KeyName,
               PayloadKey.ParentActionId, PayloadKey.StartSequenceNumber, PayloadKey.Time0, PayloadKey.EndSequenceNumber,
               PayloadKey.Time1]);

           payloadExpect(pairs, PayloadKey.EventType, EventType.WebRequest.toString());
           payloadExpect(pairs, PayloadKey.ThreadId, '1');
           payloadExpect(pairs, PayloadKey.KeyName, 'https://example.com');
           payloadExpect(pairs, PayloadKey.ParentActionId, '70');
           payloadExpect(pairs, PayloadKey.StartSequenceNumber, '196');
           payloadExpect(pairs, PayloadKey.Time0, '500');
           payloadExpect(pairs, PayloadKey.EndSequenceNumber, '207');
           payloadExpect(pairs, PayloadKey.Time1, '5000');
           payloadExpect(pairs, PayloadKey.BytesSent, undefined);
           payloadExpect(pairs, PayloadKey.BytesReceived, undefined);
           payloadExpect(pairs, PayloadKey.ResponseCode, undefined);
       });
    });
});