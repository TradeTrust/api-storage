import uuid from "uuid/v4";
import { putTransactions, getTransactionsByCustomer, createTransaction } from "../../src/models/transaction";
import * as policy from "../../src/models/policy/policy";
import { config } from "../../src/config";
import { generateRandomNric } from "../../src/common/nricValidation";

/**
 * For some reason sometimes the writes aren't instantly committed to the local dynamodb mock before we get to the next statement
 */
const delayForEventualConsistency = async (delayTimeInMilliseconds: number) => {
  return new Promise(r => setTimeout(r, delayTimeInMilliseconds));
};
const originalDateNow = Date.now;

describe("getTransactionsByCustomer", () => {
  beforeEach(() => {
    global.Date.now = jest.fn(() => 6);
  });

  afterEach(() => {
    global.Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  test("should filter out transactions older than max policy period", async () => {
    // insert records at 6, 9, 11
    // policy period == 5
    // query at date == 12
    // should return records at 9, 11

    jest.spyOn(policy, "maxPolicyDuration").mockResolvedValue(5);
    const customerId = uuid();
    await putTransactions(
      customerId,
      [
        {
          category: "category-b",
          quantity: 1
        }
      ],
      "123"
    );
    global.Date.now = jest.fn(() => 9);
    await putTransactions(
      customerId,
      [
        {
          category: "category-b",
          quantity: 1
        }
      ],
      "123"
    );
    global.Date.now = jest.fn(() => 11);
    await putTransactions(
      customerId,
      [
        {
          category: "category-b",
          quantity: 1
        }
      ],
      "123"
    );
    global.Date.now = jest.fn(() => 12);
    expect(await getTransactionsByCustomer(customerId)).toStrictEqual([
      { category: "category-b", quantity: 1, transactionTime: 9 },
      { category: "category-b", quantity: 1, transactionTime: 11 }
    ]);
  });
});

describe("putTransactions", () => {
  test("should work with a valid set of transactions", async () => {
    const customerId = uuid();
    await putTransactions(
      customerId,
      [
        {
          category: "item-a",
          quantity: 1
        },
        {
          category: "item-b",
          quantity: 2
        }
      ],
      "123"
    );

    await delayForEventualConsistency(50);
    const response = await getTransactionsByCustomer(customerId);
    expect(response).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({ category: "item-a", quantity: 1 }),
        expect.objectContaining({ category: "item-b", quantity: 2 })
      ])
    );
  });
});

describe("createTransaction", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should not allow negative transaction", async () => {
    const customerId = uuid();
    const query = () =>
      createTransaction({
        customerId,
        user: "fakeuser",
        purchaseRecords: [
          {
            category: "category-a",
            quantity: -1
          }
        ]
      });
    await expect(query()).rejects.toThrow("Invalid Purchase Request");
  });
  test("should allow negative transaction if skipValidation is true", async () => {
    const customerId = uuid();
    await createTransaction({
      customerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: -10
        }
      ],
      skipValidation: true
    });
    await delayForEventualConsistency(50);
    const response = await getTransactionsByCustomer(customerId);
    expect(response).toMatchObject(
      expect.arrayContaining([expect.objectContaining({ category: "category-a", quantity: -10 })])
    );
  });

  test("should work with a valid set of transactions", async () => {
    const customerId = uuid();
    await createTransaction({
      customerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: 1
        }
      ]
    });
    await delayForEventualConsistency(50);
    const response = await getTransactionsByCustomer(customerId);
    expect(response).toMatchObject(
      expect.arrayContaining([expect.objectContaining({ category: "category-a", quantity: 1 })])
    );
  });

  test("should fail when exceeds quota", async () => {
    const customerId = uuid();
    const transaction = createTransaction({
      customerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: 50000
        }
      ]
    });

    await expect(transaction).rejects.toThrow(/Insufficient Quota/);
    const response = await getTransactionsByCustomer(customerId);

    expect(response).toEqual([]);
  });
  test("should fail when exceeds quota on second purchase", async () => {
    const customerId = uuid();
    await createTransaction({
      customerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: 1
        }
      ]
    });
    await delayForEventualConsistency(50);
    const transaction2 = createTransaction({
      customerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: 1
        }
      ]
    });
    await expect(transaction2).rejects.toThrow(/Insufficient Quota/);
    const response = await getTransactionsByCustomer(customerId);
    expect(response).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({
          category: "category-a",
          quantity: 1
        })
      ])
    );
  });
  test("should enforce nric validation if it is enabled", async () => {
    jest.spyOn(config, "isValidationEnabled").mockReturnValue(true);

    const invalidCustomerId = uuid();
    const transaction = createTransaction({
      customerId: invalidCustomerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: 50000
        }
      ]
    });

    await expect(transaction).rejects.toThrow(/Invalid customer ID/);

    const validCustomerId = generateRandomNric();
    await createTransaction({
      customerId: validCustomerId,
      user: "fakeuser",
      purchaseRecords: [
        {
          category: "category-a",
          quantity: 1
        }
      ]
    });

    await delayForEventualConsistency(50);
    const response = await getTransactionsByCustomer(validCustomerId);
    expect(response).toMatchObject(
      expect.arrayContaining([expect.objectContaining({ category: "category-a", quantity: 1 })])
    );
  });
});
