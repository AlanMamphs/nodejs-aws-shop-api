import { describe, expect, test } from "@jest/globals";
import { handler } from "../getProductsById";
import { products } from "../mockData";

// create unit-tests for aws lambda hander that accepts product id
// and returns product object

describe("getProductsById", () => {
  test("should return product object", async () => {
    const event = {
      pathParameters: {
        id: products[0].id,
      },
    };
    // @ts-expect-error Event is mocked
    const result = await handler(event, {}, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(products[0]);
  });

  test("should return 404 ", async () => {
    const event = {
      pathParameters: {
        id: "unknownId",
      },
    };
    // @ts-expect-error Event is mocked
    const result = await handler(event, {}, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ message: "Product not found" });
  });
});
