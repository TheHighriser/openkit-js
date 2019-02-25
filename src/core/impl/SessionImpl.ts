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

import { Action } from '../../api/Action';
import { CommunicationChannel } from '../../api/communication/CommunicationChannel';
import { Session } from '../../api/Session';
import { DataCollectionLevel } from '../../DataCollectionLevel';
import { PayloadData } from '../beacon/PayloadData';
import { PayloadSender } from '../beacon/PayloadSender';
import { createLogger } from '../utils/Logger';
import { removeElement } from '../utils/Utils';
import { ActionImpl } from './ActionImpl';
import { defaultNullAction } from './NullAction';
import { OpenKitImpl } from './OpenKitImpl';
import { OpenKitObject, Status } from './OpenKitObject';
import { StatusRequestImpl } from './StatusRequestImpl';

const log = createLogger('SessionImpl');

export class SessionImpl extends OpenKitObject implements Session {
    public readonly payloadData: PayloadData;

    private readonly openKit: OpenKitImpl;
    private readonly openActions: Action[] = [];
    private readonly payloadSender: PayloadSender;
    private readonly communicationChannel: CommunicationChannel;

    constructor(openKit: OpenKitImpl, clientIp: string, sessionId: number) {
        super(openKit.state.clone());

        this.openKit = openKit;
        this.communicationChannel = this.state.config.communicationFactory.getCommunicationChannel();

        this.payloadData = new PayloadData(this.state, clientIp, sessionId);
        this.payloadSender = new PayloadSender(this.state, this.payloadData);

        this.payloadData.startSession();
    }

    /**
     * @inheritDoc
     */
    public end(): void {
        this.waitForInit(() => {
            this.endSession();
        });
    }

    /**
     * @inheritDoc
     */
    public identifyUser(userTag: string): void {
        // Only capture userTag if we track everything.
        if (this.status === Status.Shutdown ||
            this.state.config.dataCollectionLevel !== DataCollectionLevel.UserBehavior) {

            return;
        }

        // Only allow non-empty strings as userTag
        if (typeof userTag !== 'string' || userTag.length === 0) {
            return;
        }

        log.debug('Identify User', userTag);
        this.payloadData.identifyUser(userTag);

        // Send immediately as we can not be sure that the session has a correct 'end'
        this.payloadSender.flush();
    }

    public enterAction(actionName: string): Action {
        if (!this.mayEnterAction()) {
            return defaultNullAction;
        }

        const action = new ActionImpl(this, actionName, this.payloadData);

        this.openActions.push(action);

        return action;
    }

    public endAction(action: Action): void {
        removeElement(this.openActions, action);
        this.payloadSender.flush();
    }

    public init(): void {
        this.openKit.waitForInit(() => {
            this.initialize();
        });
    }

    private async initialize(): Promise<void> {
        if (this.openKit.status !== Status.Initialized) {
            return;
        }

        // our state may be outdated, update it
        this.state.updateState(this.openKit.state);

        const response = await this.communicationChannel.sendNewSessionRequest(
            this.state.config.beaconURL, StatusRequestImpl.from(this.state));

        this.finishInitialization(response);
        this.state.setServerIdLocked();
        log.debug('Successfully initialized Session', this);
    }

    private mayEnterAction(): boolean {
        return this.status !== Status.Shutdown &&
            this.state.multiplicity !== 0 &&
            this.state.config.dataCollectionLevel !== DataCollectionLevel.Off;
    }

    /**
     * Ends the session.
     * If the session is initialized, all data is flushed before shutting the session down.
     */
    private endSession(): void {
        if (this.state.config.dataCollectionLevel === DataCollectionLevel.Off) {
            // We only send the end-session event if the user enabled monitoring.
            return;
        }

        log.debug('endSession', this);

        this.openActions.slice().forEach((action) => action.leaveAction());

        if (this.status === Status.Initialized) {
            this.payloadData.endSession();
        }

        this.payloadSender.flush().then(() => {
            this.openKit.removeSession(this);
            this.shutdown();
        });
    }
}
