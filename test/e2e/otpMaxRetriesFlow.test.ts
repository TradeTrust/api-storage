import request from "supertest";
import { phone, createOperatorToken } from "../utils/setupSession";
import { config } from "../../src/config";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("OTP Max Retries Flow", () => {
  test("should allow user to try up to the maximum limit", async () => {
    const operatorToken = await createOperatorToken();
    const maxRetries = config.appParameters.maxOtpRetries;

    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: operatorToken,
        phone
      })
      .expect(200);

    for (let i = 0; i < maxRetries - 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(ENDPOINT)
        .post("/auth/confirm")
        .send({
          code: operatorToken,
          phone,
          otp: "111111"
        })
        .expect(400);
    }

    await request(ENDPOINT)
      .post("/auth/confirm")
      .send({
        code: operatorToken,
        phone,
        otp: "000000"
      })
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({
          sessionToken: expect.anything(),
          ttl: expect.anything()
        });
        expect(res.body.ttl > Date.now()).toBe(true);
      });
  });
  test("should lock the operator token once the maximum retry limit is reached", async () => {
    const operatorToken = await createOperatorToken();
    const maxRetries = config.appParameters.maxOtpRetries;

    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: operatorToken,
        phone
      })
      .expect(200);

    for (let i = 0; i <= maxRetries; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(ENDPOINT)
        .post("/auth/confirm")
        .send({
          code: operatorToken,
          phone,
          otp: "111111"
        })
        .expect(400);
    }

    await request(ENDPOINT)
      .post("/auth/confirm")
      .send({
        code: operatorToken,
        phone,
        otp: "000000"
      })
      .expect(400)
      .expect(res => {
        expect(res.body).toMatchObject({
          requestId: expect.anything(),
          message: "maximum number of otp retries reached"
        });
      });

    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: operatorToken,
        phone
      })
      .expect(400)
      .expect(res => {
        expect(res.body).toMatchObject({
          requestId: expect.anything(),
          message: "maximum number of otp retries reached"
        });
      });
  });
});
