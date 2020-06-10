import middy from "middy";
import { cors } from "middy/middlewares";
import httpSecurityHeaders from "@middy/http-security-headers";
import { withBoundary } from "../withBoundary";

export const publicRequestHandler = (handler: any) =>
  middy(handler)
    .use(cors())
    .use(httpSecurityHeaders())
    .use(withBoundary());
