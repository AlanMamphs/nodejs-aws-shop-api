import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { handler } from "../getProductsList";
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

describe("getProductsById", () => {
  beforeAll(async () => {
    for (const product of products) {
      const { count, ...rest } = product;
      await ddb.put({
        TableName: PRODUCT_TABLE_NAME,
        Item: rest,
      });
      await ddb.put({
        TableName: STOCK_TABLE_NAME,
        Item: {
          product_id: rest.id,
          count: count,
        },
      });
    }
  });
  afterAll(async () => {
    for (const product of products) {
      await ddb.delete({
        TableName: PRODUCT_TABLE_NAME,
        Key: {
          [PRODUCT_PRIMARY_KEY]: product.id,
        },
      });
      await ddb.delete({
        TableName: STOCK_TABLE_NAME,
        Key: {
          [STOCK_PRIMARY_KEY]: product.id,
        },
      });
    }
  });
  test("should return products list", async () => {
    // @ts-expect-error Event is mocked
    const result = await handler({}, {}, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(products);
  });
});
