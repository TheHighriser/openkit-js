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

import { RandomNumberProvider } from '../../../src';
import { CommunicationChannelFactory } from '../../../src/api/communication/CommunicationChannelFactory';
import {Configuration} from '../../../src/core/config/Configuration';
import {State} from '../../../src/core/impl/State';
import {CrashReportingLevel} from '../../../src/CrashReportingLevel';
import {DataCollectionLevel} from '../../../src/DataCollectionLevel';

const config: Readonly<Configuration> = {
    beaconURL: 'https://example.com',
    deviceId: '42',
    applicationName: 'app-name',
    applicationId: 'app-id',
    crashReportingLevel: CrashReportingLevel.OptOutCrashes,
    dataCollectionLevel: DataCollectionLevel.Performance,

    communicationFactory: {} as CommunicationChannelFactory,
    random: {} as RandomNumberProvider,
};

describe('State', () => {
    let state: State;

    beforeEach(() => {
       state = new State(config);
    });

    it('should contain default configuration', () => {
        expect(state.config).toBe(config);
    });

    describe('default values', () => {
        it('should return a default serverId of 1', () => {
            expect(state.serverId).toBe(1);
        });

        it('should return a default multiplicity  of 1', () => {
            expect(state.multiplicity).toBe(1);
        });

        it('should contain a max beacon size of 30 * 1024', () => {
            expect(state.maxBeaconSize).toBe(30720);
        });
    });

    describe('updateState with a status request', () => {
        it('should update the serverId', () => {
            state.updateState({ valid: true, serverId: 7});
            expect(state.serverId).toBe(7);
        });

        it('should update maxBeaconSize with the multiplier of 1024', () => {
            state.updateState({ valid: true, maxBeaconSize: 10});
            expect(state.maxBeaconSize).toBe(10240);
        });

        it('should update multiplicity', () => {
            state.updateState({ valid: true, multiplicity: 7});
            expect(state.multiplicity).toBe(7);
        });

        it('should not update any values, if the status is not 200', () => {
           state.updateState({ valid: true, serverId: 5, maxBeaconSize: 5, multiplicity: 5});
           state.updateState({ valid: false, serverId: 1, maxBeaconSize: 1, multiplicity: 1});

           expect(state.multiplicity).toBe(5);
           expect(state.maxBeaconSize).toBe(5120);
           expect(state.serverId).toBe(5);
        });
    });

    describe('updateState with another state', () => {
        const otherState = new State({} as Configuration);

        it('should update the server-id', () => {
            // given
            state.updateState({valid: true, serverId: 4});
            otherState.updateState({valid: true, serverId: 8});

            // when
            state.updateState(otherState);

            // then
            expect(state.serverId).toBe(8);
        });

        it('should not update the server-id if it is locked', () => {
            // given
            state.updateState({valid: true, serverId: 4});
            state.setServerIdLocked();
            otherState.updateState({valid: true, serverId: 8});

            // when
            state.updateState(otherState);

            // then
            expect(state.serverId).toBe(4);
        });

        it('should update the multiplicity', () => {
            // given
            state.updateState({valid: true, multiplicity: 4});
            otherState.updateState({valid: true, multiplicity: 8});

            // when
            state.updateState(otherState);

            // then
            expect(state.serverId).toBe(8);
        });

        it('should update the maxBeaconSize', () => {
            // given
            state.updateState({valid: true, maxBeaconSize: 4});
            otherState.updateState({valid: true, maxBeaconSize: 8});

            // when
            state.updateState(otherState);

            // then
            expect(state.serverId).toBe(8);
        });


    });

    describe('switches', () => {
        it('should set multiplicity to 0, after stopCommunication is called', () => {
            state.stopCommunication();
            expect(state.multiplicity).toBe(0);
        });

        it('should make the serverId unmodifiable, after setServerIdLocked is called', () => {
            state.updateState({ valid: true, serverId: 4});
            state.setServerIdLocked();
            state.updateState({ valid: true, serverId: 7});

            expect(state.serverId).toBe(4);
        });
    });

    describe('clone', () => {
        it('should return an object with equal values', () => {
            state.updateState({ valid: true, serverId: 5, multiplicity: 5, maxBeaconSize: 5});
            const newState = state.clone();

            expect(newState.multiplicity).toBe(5);
            expect(newState.maxBeaconSize).toBe(5120);
            expect(newState.serverId).toBe(5);
        });

        it('should not copy the server-id lock', () => {
            state.updateState({ valid: true, serverId: 5});
            state.setServerIdLocked();
            const newState = state.clone();
            newState.updateState({ valid: true, serverId: 7});

            expect(newState.serverId).toBe(7);
        });
    });
});