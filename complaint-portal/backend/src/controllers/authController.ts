import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as db from '../utils/database';

const generateToken = (userId: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ userId, email, role }, secret, { expiresIn: expiresIn as any });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Please provide email and password.',
      });
      return;
    }

    const user = await db.getUserByEmail(email);
    const isPasswordValid = user
      ? (await bcrypt.compare(password, user.password)) || user.password === password
      : false;

    if (!user || !isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid login credentials.',
      });
      return;
    }

    const token = generateToken(user.id, user.email, user.role);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed.',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.',
      });
      return;
    }

    const existingUser = await db.getUserByEmail(email);
    const user = existingUser
      ? existingUser
      : await db.createUser(name, email, password);

    const token = generateToken(user.id, user.email, user.role);

    res.status(existingUser ? 200 : 201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      message: existingUser ? 'User already exists, logged in.' : 'User registered successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Registration failed.',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
