import request from "supertest";
import uuid from "uuid/v4";
import { createSession, phone } from "../utils/setupSession";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("auth/otp", () => {
  let sessionToken: string;
  let operatorToken: string;
  beforeEach(async () => {
    const session = await createSession();
    sessionToken = session.sessionToken;
    operatorToken = session.operatorToken;
  });

  test("user should not be able to authenticate with operator token anymore", async () => {
    await request(ENDPOINT)
      .get("/auth")
      .set("Authorization", operatorToken)
      .expect(401)
      .expect(res => {
        expect(res.body).toMatchObject({
          requestId: expect.anything(),
          message: "Invalid authentication token provided"
        });
      });
  });

  test("user should be able to authenticate with session token", async () => {
    await request(ENDPOINT)
      .get("/auth")
      .set("Authorization", sessionToken)
      .expect(200)
      .expect(res => {
        expect(res.body).toBeTruthy();
      });
  });

  test("existing session should be terminated if the code is re-registered", async () => {
    // This prevents multiple operators to share code
    await request(ENDPOINT)
      .get("/auth")
      .set("Authorization", sessionToken)
      .expect(200)
      .expect(res => {
        expect(res.body).toBeTruthy();
      });
    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: operatorToken,
        phone
      })
      .expect(200);
    await request(ENDPOINT)
      .get("/auth")
      .set("Authorization", sessionToken)
      .expect(401);
  });

  test("disallow re-registration to another number once a code has been registered to a number", async () => {
    const token = uuid();
    await request(ENDPOINT)
      .post("/auth")
      .send({
        operatorToken: token,
        role: "OPERATOR",
        userReference: "S0000000J",
        validFrom: 1,
        validTill: Date.now() + 100000
      })
      .expect(200);
    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: token,
        phone: "+6588888888"
      })
      .expect(200)
      .expect(res => {
        expect(res.body).toBeTruthy();
      });
    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: token,
        phone
      })
      .expect(400)
      .expect(res => {
        expect(res.body).toEqual({
          requestId: expect.anything(),
          message: "Cannot register another phone number to this code"
        });
      });
  });

  test("disallow re-registration to another number once session has been created", async () => {
    // Prevent the re-use of an operator code by another individual once a session has been generated for one staff
    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: operatorToken,
        phone: "+6588888888"
      })
      .expect(400)
      .expect(res => {
        expect(res.body).toEqual({
          requestId: expect.anything(),
          message: "Cannot register another phone number to this code"
        });
      });
  });

  test("allow user with same phone number to create another session", async () => {
    // Assuming the operator lost the sessions for whatever reason,
    // the operator can still scan the same code to request for another session
    await request(ENDPOINT)
      .post("/auth/register")
      .send({
        code: operatorToken,
        phone
      })
      .expect(200);
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

  test("disallow session generation when code is not re-scanned", async () => {
    // Prevent an attacker with the code from trying to enumerate another session
    // by guessing the otp
    await request(ENDPOINT)
      .post("/auth/confirm")
      .send({
        code: operatorToken,
        phone,
        otp: "000000"
      })
      .expect(400)
      .expect(res => {
        expect(res.body).toEqual({
          requestId: expect.anything(),
          message: "sessionToken has not been invalidated"
        });
      });
  });
});
