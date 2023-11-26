import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { APIGatewayEvent, Handler } from "aws-lambda";
import { lambdaResp, withLogger } from "./utils";
import { PRODUCT_TABLE_NAME, STOCK_TABLE_NAME } from "./constants";

import { ddb } from "./dynamoDBClient";

const scanProducts = async () => {
  const params = {
    TableName: PRODUCT_TABLE_NAME,
  };

  return ddb.scan(params).promise();
};

const scanStocks = async () => {
  const params = {
    TableName: STOCK_TABLE_NAME,
  };

  return ddb.scan(params).promise();
};

export const handler: Handler<APIGatewayEvent> = withLogger(async () => {
  try {
    const [products, stocks] = await Promise.all([
      scanProducts(),
      scanStocks(),
    ]);
    const data = products.Items?.map((product) => {
      const stock = stocks.Items?.find((s) => s.product_id === product.id) || {
        count: 0,
      };
      return { ...product, count: stock.count };
    });
    return lambdaResp({ statusCode: 200, body: data ?? [] });
  } catch (dbError) {
    return lambdaResp({ statusCode: 500, body: { message: dbError } });
  }
});
