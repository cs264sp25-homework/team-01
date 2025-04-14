/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as conceptMap from "../conceptMap.js";
import type * as hello from "../hello.js";
import type * as http from "../http.js";
import type * as notes from "../notes.js";
import type * as notes_queries from "../notes_queries.js";
import type * as openai from "../openai.js";
import type * as testGenerator from "../testGenerator.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chat: typeof chat;
  conceptMap: typeof conceptMap;
  hello: typeof hello;
  http: typeof http;
  notes: typeof notes;
  notes_queries: typeof notes_queries;
  openai: typeof openai;
  testGenerator: typeof testGenerator;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
