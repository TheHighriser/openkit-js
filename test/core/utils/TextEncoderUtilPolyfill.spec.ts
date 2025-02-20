/*
 * Copyright 2022 Dynatrace LLC
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

import { TextEncoder as TextEncoderOrig } from 'util';
import { lengthInUtf8Bytes } from '../../../src/core/utils/TextEncoderUtilPolyfill';

describe('TextEncoderUtilPolyfill', () => {
    beforeEach(() => {
        // @ts-expect-error
        global.window = {
            TextEncoder: TextEncoderOrig,
        };

        global.globalThis.TextEncoder = TextEncoderOrig;
    });

    it('should use TextEncoder API of globalThis if available', () => {
        // @ts-expect-error
        global.window = {
            TextEncoder: undefined,
        };

        const mockedTextEncoder = jest.fn().mockImplementation(() => ({
            encode: () => 'mockedGlobal',
        }));

        global.globalThis.TextEncoder = mockedTextEncoder;

        expect(lengthInUtf8Bytes('Hello')).toBe('mockedGlobal'.length);
    });

    it('should use TextEncoder API of window if available', () => {
        const mockedTextEncoder = jest.fn().mockImplementation(() => ({
            encode: () => 'mockedWindowObj',
        }));

        // @ts-expect-error
        global.window = {
            TextEncoder: mockedTextEncoder,
        };

        // @ts-expect-error
        global.globalThis.TextEncoder = undefined;

        expect(lengthInUtf8Bytes('Hello')).toBe('mockedWindowObj'.length);
    });

    it('should use a fallback if no TextEncoder API is available', () => {
        // @ts-expect-error
        global.window = {
            TextEncoder: undefined,
        };

        // @ts-expect-error
        global.globalThis.TextEncoder = undefined;

        expect(lengthInUtf8Bytes('Hello')).toBe(5);
    });
});
