import request from "supertest";
import { TESTING_JWT_OLD, TESTING_JWT_NEW } from "../utils/constants";

const ENDPOINT = process.env.ENDPOINT || "http://localhost:3000";

describe("individualQuota", () => {
  describe("successful tests with JSON response", () => {
    test("get quota with new JWT format should pass (no past transaction)", async () => {
      await request(ENDPOINT)
        .get("/individualQuota")
        .set("Authorization", `Bearer ${TESTING_JWT_NEW}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toMatchObject({
            quotaSummary: [
              {
                category: "category-a",
                quantity: 1,
                transactionTime: 0,
                period: 30,
                quantityLimit: 1,
                name: "Category A",
                description: "abc",
                unit: {
                  label: "kg",
                  type: "POSTFIX"
                },
                nextAvailableQuota: "in 30 days"
              },
              {
                category: "category-b",
                quantity: 10,
                transactionTime: 0,
                period: 30,
                quantityLimit: 10,
                name: "Category B",
                description: "bca",
                unit: {
                  label: "$",
                  type: "PREFIX"
                },
                nextAvailableQuota: "in 30 days"
              },
              {
                category: "category-c",
                description: "moo",
                name: "Category C",
                nextAvailableQuota: "in 30 days",
                period: 30,
                quantity: 0,
                quantityLimit: 0,
                transactionTime: 0,
                unit: {
                  label: "$",
                  type: "PREFIX"
                }
              }
            ]
          });
        });
    });

    test("get quota with old JWT format should pass (no past transaction)", async () => {
      await request(ENDPOINT)
        .get("/individualQuota")
        .set("Authorization", `Bearer ${TESTING_JWT_OLD}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toMatchObject({
            quotaSummary: [
              {
                category: "category-a",
                quantity: 1,
                transactionTime: 0,
                period: 30,
                quantityLimit: 1,
                name: "Category A",
                description: "abc",
                unit: {
                  label: "kg",
                  type: "POSTFIX"
                },
                nextAvailableQuota: "in 30 days"
              },
              {
                category: "category-b",
                quantity: 10,
                transactionTime: 0,
                period: 30,
                quantityLimit: 10,
                name: "Category B",
                description: "bca",
                unit: {
                  label: "$",
                  type: "PREFIX"
                },
                nextAvailableQuota: "in 30 days"
              },
              {
                category: "category-c",
                description: "moo",
                name: "Category C",
                nextAvailableQuota: "in 30 days",
                period: 30,
                quantity: 0,
                quantityLimit: 0,
                transactionTime: 0,
                unit: {
                  label: "$",
                  type: "PREFIX"
                }
              }
            ]
          });
        });
    });
  });

  describe("unsuccessful tests with error response in text format", () => {
    test("get quota with auth token should fail", async () => {
      await request(ENDPOINT)
        .get("/individualQuota")
        .set("Authorization", "1234")
        .expect(401)
        .expect(res => {
          expect(res.body).toMatchObject({
            requestId: expect.anything(),
            message: 'Format should be "Authorization: Bearer [token]", received "Authorization: 1234" instead'
          });
        });
    });
  });
});
