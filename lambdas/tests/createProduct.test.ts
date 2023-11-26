import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { handler } from "../createProduct";
import { products } from "./mockData";
import { ddb } from "../dynamoDBClient";
import {
  PRODUCT_PRIMARY_KEY,
  PRODUCT_TABLE_NAME,
  STOCK_PRIMARY_KEY,
  STOCK_TABLE_NAME,
} from "../constants";
// create unit-tests for aws lambda hander that accepts product id
// and returns product object
// import * as jest from "jest";

// Mock the uuid module
// @ts-ignore
jest.mock("uuid", () => ({
  // @ts-ignore
  v4: jest.fn(() => products[0].id),
}));

describe("createProduct", () => {
  test("should create product and count items", async () => {
    const event = {
      body: JSON.stringify(products[0]),
    };
    // @ts-expect-error Event is mocked
    const result = await handler(event, {}, () => {});

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({});

    const product = await ddb
      .get({
        TableName: PRODUCT_TABLE_NAME,
        Key: {
          [PRODUCT_PRIMARY_KEY]: products[0].id,
        },
      })
      .promise();

    const stock = await ddb
      .get({
        TableName: STOCK_TABLE_NAME,
        Key: {
          [STOCK_PRIMARY_KEY]: products[0].id,
        },
      })
      .promise();
    const { count, id, ...rest } = products[0];

    expect(product.Item).toEqual({ id, ...rest });
    expect(stock.Item).toEqual({ product_id: id, count });
  });
});
