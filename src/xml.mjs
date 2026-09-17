import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: true,
});

export const parseXml = (text) => parser.parse(text);

/** Every element named `tag` anywhere under `node`, in document order. */
export const collect = (node, tag, out = []) => {
  if (Array.isArray(node)) for (const item of node) collect(item, tag, out);
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("@_")) continue;
      if (key === tag) out.push(...(Array.isArray(value) ? value : [value]));
      else collect(value, tag, out);
    }
  }
  return out;
};

export const asArray = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
