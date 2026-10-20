import { randomBytes } from "node:crypto";
import { prisma } from "../../config/index.js";

export class AuthService {
  public async signIn() {
    const user = await prisma.order.findFirst();

    if (user.password !== payload.password) {
      throw new BadRequestException("Incorrect email or password");
    }

    const sessionToken = randomBytes(32).toString("hex");

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
      },
    });

    return session;
  }

  async signUp(payload: CreateUserRequestDTO) {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new BadRequestException("User already exists");
    }

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        password: payload.password,
      },
    });

    const sessionToken = randomBytes(32).toString("hex");

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
      },
    });

    return session;
  }
}
