import type { Spritesheet } from '@pixi/spritesheet';
import { Texture } from '@pixi/core';
import { BitmapFont } from '@pixi/text-bitmap';

import type { LoaderParser } from '../src/loader';
import { Loader, loadJson, loadSpritesheet, loadTextures, loadWebFont, loadBitmapFont } from '../src/loader';

import { exec, ChildProcess } from 'child_process';

const dummyPlugin: LoaderParser = {
    async load(url: string): Promise<string>
    {
        return url;
    },
} as LoaderParser<string, string>;

const serverPath = 'http://localhost:8080/';

describe('Loader', () =>
{
    let server: ChildProcess;

    beforeAll(() =>
    {
        server = exec(`npx http-server ./assets`);
    });
    afterAll(() =>
    {
        server.kill();
    });

    it('should add and remove a plugin', () =>
    {
        const loader = new Loader();

        loader.addParser(dummyPlugin);

        expect(loader.parsers).toHaveLength(1);

        loader.removeParser(dummyPlugin);

        expect(loader.parsers).toHaveLength(0);
    });

    it('should load a single image', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadTextures);

        const texture: Texture = await loader.load(`${serverPath}bunny.png`);

        expect(texture.baseTexture.valid).toBe(true);
        expect(texture.width).toBe(26);
        expect(texture.height).toBe(37);
    });

    it('should load a single image one after multiple loads', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadTextures);

        const texturesPromises = [];

        for (let i = 0; i < 10; i++)
        {
            texturesPromises.push(loader.load(`${serverPath}bunny.png`));
        }

        const textures = await Promise.all(texturesPromises);

        const ogTexture = textures[0];

        textures.forEach((texture) =>
        {
            expect(texture).toBe(ogTexture);
        });
    });

    it('should load multiple images', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadTextures);

        const assetsUrls = [`${serverPath}bunny.png`, `${serverPath}bunny-2.png`];

        const textures = await loader.load(assetsUrls);

        expect(textures[`${serverPath}bunny.png`]).toBeInstanceOf(Texture);
        expect(textures[`${serverPath}bunny-2.png`]).toBeInstanceOf(Texture);
    });

    it('should load json file', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadJson);

        const json = await loader.load(`${serverPath}test.json`);

        expect(json).toEqual({
            testNumber: 23,
            testString: 'Test String 23',
        });
    });

    it('should load a spritesheet', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadJson, loadTextures, loadSpritesheet);

        const spriteSheet: Spritesheet = await loader.load(`${serverPath}spritesheet.json`);

        const bunnyTexture = spriteSheet.textures['bunny.png'];
        const senseiTexture = spriteSheet.textures['pic-sensei.jpg'];

        expect(bunnyTexture).toBeInstanceOf(Texture);
        expect(senseiTexture).toBeInstanceOf(Texture);

        expect(bunnyTexture.baseTexture).toBe(senseiTexture.baseTexture);

        expect(bunnyTexture.baseTexture.valid).toBe(true);
        expect(bunnyTexture.width).toBe(7);
        expect(bunnyTexture.height).toBe(10);

        expect(senseiTexture.baseTexture.valid).toBe(true);
        expect(senseiTexture.width).toBe(125);
        expect(senseiTexture.height).toBe(125);
    });

    it('should load a bitmap font', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadTextures, loadBitmapFont);

        const bitmapFont: BitmapFont = await loader.load(`${serverPath}bitmap-font/desyrel.xml`);

        expect(bitmapFont).toBeInstanceOf(BitmapFont);
    });

    it('should load a web font', async () =>
    {
        const loader = new Loader();

        loader.addParser(loadWebFont);

        await loader.load(`${serverPath}outfit.woff2`);

        let foundFont = false;

        document.fonts.forEach((f: FontFace) =>
        {
            if (f.family === 'Outfit.woff2')
            {
                foundFont = true;
            }
        });

        expect(foundFont).toBe(true);
    });

    it('should load a specific weight web font', async () =>
    {
        const loader = new Loader();

        await document.fonts.clear();
        loader.addParser(loadWebFont);

        await loader.load({
            data: {
                weights: ['normal'],
            },
            src: `${serverPath}outfit.woff2`,
        });

        let count = 0;

        document.fonts.forEach((f: FontFace) =>
        {
            count++;
            expect(f.weight).toBe('normal');
        });

        expect(count).toBe(1);
    });

    it('should load with metaData', async () =>
    {
        const loader = new Loader();

        loader.addParser({
            test: () => true,
            load: async (url, options) =>
                url + options.data.whatever,
        } as LoaderParser<string>);

        const sillyID: string = await loader.load({
            src: `${serverPath}bunny.png`,
            data: { whatever: 23 },
        });

        expect(sillyID).toBe(`${serverPath}bunny.png23`);
    });
});
