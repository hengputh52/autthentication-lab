import db from '../models/index.js';
import authConfig from '../config/auth.config.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User registration and login
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user (student or teacher)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [role, name, email, password]
 *                 properties:
 *                   role:
 *                     type: string
 *                     description: Must be 'student'
 *                     enum: [student]
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *                     format: password
 *               - type: object
 *                 required: [role, name, email, password, department]
 *                 properties:
 *                   role:
 *                     type: string
 *                     description: Must be 'teacher'
 *                     enum: [teacher]
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *                     format: password
 *                   department:
 *                     type: string
 *                     description: Required when role is 'teacher'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request (e.g., email already exists, invalid role)
 *       500:
 *         description: Server error
 */
export const register = async (req, res) => {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "Please provide name, email, password, and role." });
    }

    if (role !== 'student' && role !== 'teacher') {
        return res.status(400).json({ message: "Role must be either 'student' or 'teacher'." });
    }

    if (role === 'teacher' && !department) {
        return res.status(400).json({ message: "Please provide a department for the teacher role." });
    }

    const t = await db.sequelize.transaction();

    try {
        const userExists = await db.User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: "User with this email already exists." });
        }

        if (role === 'student') {
            const studentExists = await db.Student.findOne({ where: { email } });
            if (studentExists) {
                return res.status(400).json({ message: "Student with this email already exists." });
            }

            const student = await db.Student.create({ name, email }, { transaction: t });
            const user = await db.User.create({ email, password: bcrypt.hashSync(password, 8), StudentId: student.id }, { transaction: t });

            await t.commit();
            res.status(201).json({ message: "Student user registered successfully!", studentId: student.id, userId: user.id });
        }
        else { // role === 'teacher'
            const teacher = await db.Teacher.create({ name, department }, { transaction: t });
            const user = await db.User.create({ email, password: bcrypt.hashSync(password, 8), TeacherId: teacher.id }, { transaction: t });

            await t.commit();
            res.status(201).json({ message: "Teacher user registered successfully!", teacherId: teacher.id, userId: user.id });
        }

    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *                   enum: [student, teacher]
 *                   description: The role of the logged-in user.
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password." });
    }

    try {
        const user = await db.User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ message: "Invalid Password!" });
        }

        const token = jwt.sign({ id: user.id }, authConfig.secret, {
            expiresIn: authConfig.expiresIn
        });

        // Determine the user's role based on the foreign key that is set
        let role = null;
        if (user.StudentId) {
            role = 'student';
        } else if (user.TeacherId) {
            role = 'teacher';
        }

        res.status(200).json({
            id: user.id,
            email: user.email,
            role: role,
            accessToken: token
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
