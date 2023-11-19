import { products } from "./mockData";

export const handler = async (): Promise<{
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}> => {
  return {
    statusCode: 200,
    body: JSON.stringify(products),
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  };
};
