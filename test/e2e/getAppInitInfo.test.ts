import request from "supertest";
import { createSession } from "../utils/setupSession";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("info", () => {
  let sessionToken: string;
  beforeEach(async () => {
    const session = await createSession();
    sessionToken = session.sessionToken;
  });

  test("user should be able to authenticate with session token", async () => {
    await request(ENDPOINT)
      .get("/version")
      .set("Authorization", sessionToken)
      .expect(200)
      .expect(res => {
        expect(res.body).toBeTruthy();
      });
  });

  test("ensure both policies and features are present", async () => {
    await request(ENDPOINT)
      .get("/version")
      .set("Authorization", sessionToken)
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveProperty("features");
        expect(res.body).toHaveProperty("policies");
      });
  });
});
