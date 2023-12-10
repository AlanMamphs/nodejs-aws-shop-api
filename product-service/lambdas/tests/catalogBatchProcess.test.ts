import { describe, expect, test } from "@jest/globals";
import { handler } from "../catalogBatchProcess";
import { products } from "./mockData";
import { ddb } from "../dynamoDBClient";
import { snsClient } from "../snsClient";
import { mockClient } from "aws-sdk-client-mock";
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from "../constants";

const snsMock = mockClient(snsClient);

describe("catalogBatchProcess", () => {
  test("should create product and count items and send sns", async () => {
    const event = {
      Records: products.map((p) => ({ body: JSON.stringify(p) })),
    };
    expect(snsMock.send.callCount).toBe(0);
    let productsData = await ddb.scan({
      TableName: PRODUCT_TABLE_NAME,
    });
    let stocksData = await ddb.scan({
      TableName: STOCK_TABLE_NAME,
    });
    expect(productsData.Count).toBe(0);
    expect(stocksData.Count).toBe(0);

    // @ts-expect-error Event is mocked
    const result = await handler(event, {}, () => {});

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({});

    expect(snsMock.send.callCount).toBe(1);
    productsData = await ddb.scan({
      TableName: PRODUCT_TABLE_NAME,
    });
    stocksData = await ddb.scan({
      TableName: STOCK_TABLE_NAME,
    });
    expect(productsData.Count).toBe(2);
    expect(stocksData.Count).toBe(2);
  });
});
