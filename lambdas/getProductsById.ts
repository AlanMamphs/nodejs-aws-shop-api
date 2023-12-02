import { APIGatewayEvent, Handler } from "aws-lambda";
import { lambdaResp, withLogger } from "./utils";

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || "Products";
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || "Stock";
const PRODUCT_PRIMARY_KEY = process.env.PRODUCT_PRIMARY_KEY || "id";
const STOCK_PRIMARY_KEY = process.env.STOCK_PRIMARY_KEY || "product_id";

import { ddb } from "./dynamoDBClient";

const getProductById = (productId: string) => {
  const params = {
    TableName: PRODUCT_TABLE_NAME,
    Key: {
      [PRODUCT_PRIMARY_KEY]: productId,
    },
  };
  return ddb.get(params);
};

const getStockByProductId = (productId: string) => {
  const params = {
    TableName: STOCK_TABLE_NAME,
    Key: {
      [STOCK_PRIMARY_KEY]: productId,
    },
  };
  return ddb.get(params);
};

export const handler: Handler<APIGatewayEvent> = withLogger(async (event) => {
  const productId = event.pathParameters?.id;
  if (!productId) {
    return lambdaResp({
      statusCode: 400,
      body: { message: `Error: You are missing the path parameter id` },
    });
  }

  try {
    const { Item: product } = await getProductById(productId);

    if (product) {
      const { Item: stock } = await getStockByProductId(productId);
      return lambdaResp({
        statusCode: 200,
        body: { ...product, count: stock?.count ?? 0 },
      });
    } else {
      return lambdaResp({
        statusCode: 404,
        body: { message: "Product is not found" },
      });
    }
  } catch (dbError) {
    return lambdaResp({ statusCode: 500, body: { message: dbError } });
  }
});
