import request from "supertest";
import { generateRandomNric } from "../../src/common/nricValidation";

import { createSession } from "../utils/setupSession";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("auth/post", () => {
  let sessionToken: string;
  beforeAll(async () => {
    const session = await createSession();
    sessionToken = session.sessionToken;
  });

  test("get quota for new user should say 0 quota", async () => {
    const customerId = generateRandomNric();
    await request(ENDPOINT)
      .get(`/quota/${customerId}`)
      .set("Authorization", sessionToken)
      .expect(res => {
        expect(res.body).toMatchObject({
          remainingQuota: [
            { category: "category-a", quantity: 1, transactionTime: 0 },
            { category: "category-b", quantity: 10, transactionTime: 0 },
            { category: "category-c", quantity: 0, transactionTime: 0 }
          ]
        });
      });
  });
  test("transaction for new user should work ", async () => {
    const customerId = generateRandomNric();
    await request(ENDPOINT)
      .post(`/transactions/${customerId}`)
      .send([{ category: "category-a", quantity: 1 }])
      .set("Authorization", sessionToken)
      .expect(res => {
        expect(res.body).toMatchObject({
          transactions: [{ category: "category-a", quantity: 1 }],
          timestamp: expect.any(Number)
        });
      });
  });
  test("transaction for user with expended quota should fail", async () => {
    const customerId = generateRandomNric();
    await request(ENDPOINT)
      .post(`/transactions/${customerId}`)
      .send([{ category: "category-a", quantity: 1 }])
      .set("Authorization", sessionToken)
      .expect(res => {
        expect(res.body).toMatchObject({
          transactions: [{ category: "category-a", quantity: 1 }],
          timestamp: expect.any(Number)
        });
      });

    await request(ENDPOINT)
      .post(`/transactions/${customerId}`)
      .send([{ category: "category-a", quantity: 1 }])
      .set("Authorization", sessionToken)
      .expect(400)
      .expect(res => {
        expect(res.body).toMatchObject({
          message: "Insufficient Quota",
          requestId: expect.anything()
        });
      });
  });
});
