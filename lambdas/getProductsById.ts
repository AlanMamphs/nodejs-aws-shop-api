export const handler = async (): Promise<{
  statusCode: number;
  body: string;
}> => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      description: "Short Product Description1",
      id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
      price: 24,
      title: "ProductOne",
      count: 1,
    }),
  };
};
