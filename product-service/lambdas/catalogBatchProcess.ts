import { SQSEvent, Handler } from "aws-lambda";

import { v4 as uuidv4 } from "uuid";
import { ddb } from "./dynamoDBClient";
import { snsClient } from "./snsClient";
import { lambdaResp, withLogger } from "./utils";
import { PublishCommand, MessageAttributeValue } from "@aws-sdk/client-sns";

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || "Products";
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || "Stock";
const PRODUCT_PRIMARY_KEY = process.env.PRODUCT_PRIMARY_KEY || "id";
const STOCK_PRIMARY_KEY = process.env.STOCK_PRIMARY_KEY || "product_id";

const generateProductId = () => uuidv4();

const products: object[] = [];
export const handler: Handler<SQSEvent> = withLogger(async (event) => {
  const TransactItems = [];
  let totalCount = 0;
  for (const message of event.Records) {
    const { title, description, price, count } = JSON.parse(message.body);
    totalCount += Number(count);
    const productId = generateProductId();

    products.push({
      productId,
      title,
      description,
      price: Number(price),
      count: Number(count),
    });

    const product = {
      [PRODUCT_PRIMARY_KEY]: productId,
      title,
      description,
      price: Number(price),
    };

    const stock = {
      [STOCK_PRIMARY_KEY]: productId,
      count: Number(count),
    };

    TransactItems.push({
      Put: {
        TableName: PRODUCT_TABLE_NAME,
        Item: product,
      },
    });

    TransactItems.push({
      Put: {
        TableName: STOCK_TABLE_NAME,
        Item: stock,
      },
    });
  }

  try {
    const result = await ddb.transactWrite({
      TransactItems,
    });
    console.log("Transaction Result:", result);
    // send email via sns
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.EMAIL_TOPIC_ARN,
        Subject: "[CATALOG BATCH] Products Catalog from CSV",
        Message: JSON.stringify({
          products,
          totalCount,
          message: "Products were successfully generated from csv",
        }),
        MessageAttributes: {
          totalCount: {
            DataType: "Number",
            StringValue: totalCount.toString(),
          },
        },
      })
    );

    return lambdaResp({ statusCode: 201, body: {} });
  } catch (dbError) {
    console.error("Error creating product and stock:", dbError);
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.EMAIL_TOPIC_ARN,
        Subject: "[CATALOG BATCH] Products Catalog from CSV",
        Message: JSON.stringify(
          {
            totalCount,
            products,
            message: "Products failed to be created",
          },
          null,
          2
        ),
        MessageAttributes: {
          totalCount: {
            DataType: "Number",
            StringValue: totalCount.toString(),
          },
        },
      })
    );
    return lambdaResp({ statusCode: 500, body: { message: dbError } });
  }
});
