import request from "supertest";
import { generateRandomNric } from "../../src/common/nricValidation";
import { createSession } from "../utils/setupSession";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("view past transactions", () => {
  let sessionToken: string;
  beforeAll(async () => {
    const session = await createSession();
    sessionToken = session.sessionToken;
  });

  test("should return an empty list when there's no past transactions", async () => {
    const customerId = generateRandomNric();
    await request(ENDPOINT)
      .get(`/transactions/${customerId}`)
      .set("Authorization", sessionToken)
      .expect(res => {
        expect(res.body).toMatchObject({ pastTransactions: [] });
      });
  });

  test("should return all past transactions in policy period if they exist", async () => {
    const customerId = generateRandomNric();
    await request(ENDPOINT)
      .post(`/transactions/${customerId}`)
      .send([{ category: "category-a", quantity: 1 }])
      .set("Authorization", sessionToken)
      .expect(200);

    await request(ENDPOINT)
      .get(`/transactions/${customerId}`)
      .set("Authorization", sessionToken)
      .expect(res => {
        expect(res.body).toMatchObject({
          pastTransactions: [
            {
              category: "category-a",
              quantity: 1,
              transactionTime: expect.any(Number)
            }
          ]
        });
      });
  });
});
