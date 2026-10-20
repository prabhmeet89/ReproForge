import { AuthenticatedUser } from "../middleware/requireAuth";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by the requireAuth middleware. Only ever contains the id and
       * email of the logged-in user — never the session token.
       */
      user?: AuthenticatedUser;
    }
  }
}

export {};
