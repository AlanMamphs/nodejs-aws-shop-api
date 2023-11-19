import { describe, expect, test } from "@jest/globals";
import { handler } from "../getProductsList";
import { products } from "../mockData";

// create unit-tests for aws lambda hander that accepts product id
// and returns product object

describe("getProductsById", () => {
  test("should return product object", async () => {
    // @ts-expect-error Event is mocked
    const result = await handler({}, {}, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(products);
  });
});
