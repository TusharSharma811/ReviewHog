import  Jwt  from "jsonwebtoken";
import { Response , Request , NextFunction } from "express";

type reqwithUser = Request & { user?: any };
const verifyJWT = (req: reqwithUser, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const secret: string = process.env.JWT_SECRET as string;
  Jwt.verify(token, secret, (err : any, decoded : any) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded;
    next();
  });
};

export default verifyJWT;
