import request from "supertest";
import uuid from "uuid/v4";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("auth/post", () => {
  test("should create token successfully with valid parameters", async () => {
    const token = uuid();
    await request(ENDPOINT)
      .post("/auth")
      .send({
        operatorToken: token,
        role: "OPERATOR",
        userReference: "S1234567B",
        validFrom: 1,
        validTill: 3686052000000 // Year 2086
      })
      .expect(200)
      .expect(res =>
        expect(res.body).toMatchObject({ operatorToken: token, role: "OPERATOR", userReference: "S1234567B" })
      );
  });

  test("should fail to create token without validity period", async () => {
    const token = uuid();
    await request(ENDPOINT)
      .post("/auth")
      .send({
        operatorToken: token,
        role: "OPERATOR",
        userReference: "S1234567B"
      })
      .expect(400)
      .expect(res => {
        expect(res.body).toMatchObject({
          requestId: expect.anything(),
          message: '"validFrom" is required'
        });
      });
  });
});
