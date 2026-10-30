// zsviczian -- #477/#3022: saved host image metadata and independent shared-source geometry.
import { describe, expect, it } from "vitest";

import { restoreElements } from "@excalidraw/excalidraw";
import { isImageElement } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import fixture from "../fixtures/image-variants.json";

describe("saved host image variants", () => {
  it.each(fixture.cases)(
    "$sourceKind opacity=$opacity locked=$locked cropped=$cropped preserves shared-source geometry",
    ({ sourceKind, opacity, locked, cropped }) => {
      const crop = cropped
        ? {
            x: 10,
            y: 5,
            width: 60,
            height: 30,
            naturalWidth: 100,
            naturalHeight: 60,
          }
        : null;
      const base = {
        type: "image",
        fileId: "owned-shared-file",
        angle: 0,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity,
        locked,
        groupIds: ["owned-group"],
        frameId: "owned-frame",
        seed: 1,
        version: 1,
        versionNonce: 0,
        isDeleted: false,
        boundElements: null,
        link: "[[Owned source#page=1]]",
        scale: [1, 1],
        status: "saved",
        updated: 1,
        customData: {
          hostSourceKind: sourceKind,
          future: { zero: 0, enabled: false },
        },
      };
      const input = [
        {
          ...base,
          id: "owned-frame",
          type: "frame",
          x: 0,
          y: 0,
          width: 500,
          height: 300,
          frameId: null,
          name: "Owned frame",
        },
        {
          ...base,
          id: "owned-left",
          x: 10,
          y: 20,
          width: 100,
          height: 60,
          crop: null,
        },
        {
          ...base,
          id: "owned-right",
          x: 180,
          y: 20,
          width: 50,
          height: cropped ? 25 : 30,
          crop,
        },
      ];
      const before = JSON.stringify(input);
      const restored = restoreElements(
        JSON.parse(before) as ExcalidrawElement[],
        null,
      );
      const images = restored.filter(isImageElement);
      expect(images).toHaveLength(2);
      const [left, right] = images;
      expect(left.fileId).toBe(right.fileId);
      expect(left.crop).toBeNull();
      expect(right.crop).toEqual(crop);
      expect([left.width, left.height, right.width, right.height]).toEqual([
        100,
        60,
        50,
        cropped ? 25 : 30,
      ]);
      for (const image of images) {
        expect(image.opacity).toBe(opacity);
        expect(image.locked).toBe(locked);
        expect(image.frameId).toBe("owned-frame");
        expect(image.groupIds).toEqual(["owned-group"]);
        expect(image.link).toBe(base.link);
        expect(image.customData).toEqual(base.customData);
      }
      const reopened = restoreElements(
        JSON.parse(JSON.stringify(restored)),
        null,
      ).filter(isImageElement);
      expect(
        reopened.map((image) => ({
          id: image.id,
          fileId: image.fileId,
          width: image.width,
          height: image.height,
          crop: image.crop,
          customData: image.customData,
        })),
      ).toEqual(
        images.map((image) => ({
          id: image.id,
          fileId: image.fileId,
          width: image.width,
          height: image.height,
          crop: image.crop,
          customData: image.customData,
        })),
      );
      expect(JSON.stringify(input)).toBe(before);
    },
  );
});
