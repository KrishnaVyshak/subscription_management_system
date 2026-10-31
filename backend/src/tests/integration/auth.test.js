import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { makeUser, signToken } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { fakeAuth } from '../helpers/fakeSupabase.js';

const app = createApp();
const body = { email: 'New.User@Example.com', password: 'Abcdefg!1', fullName: 'New User' };

describeDb('auth', () => {
  useDb();

  it('signs up a customer and ignores a role in the body', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...body, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'new.user@example.com', role: 'customer' });
    expect(res.body.data.customerId).toBeTruthy();
    expect(fakeAuth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email_confirm: true }),
    );
  });

  it('returns 409 on a duplicate email', async () => {
    await request(app).post('/api/auth/signup').send(body).expect(201);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...body, email: 'new.user@EXAMPLE.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 on a weak password', async () => {
    for (const password of ['Abcdefg!', 'abcdefgh!', 'ABCDEFGH1']) {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ ...body, password });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('links an existing staff-created customer with the same email', async () => {
    const { rows } = await query(
      `insert into customers (name, email) values ('Acme', 'new.user@example.com') returning id`,
    );
    const res = await request(app).post('/api/auth/signup').send(body).expect(201);
    expect(res.body.data.customerId).toBe(rows[0].id);
  });

  it('rolls back the auth user when the database step fails', async () => {
    const other = await makeUser('customer');
    // Customer row with this email already belongs to someone else, so the insert conflicts.
    await query(`update customers set email = 'new.user@example.com' where id = $1`, [
      other.customerId,
    ]);
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(409);
    expect(fakeAuth.admin.deleteUser).toHaveBeenCalledTimes(1);
    expect(fakeAuth.users.size).toBe(0);
  });

  it('GET/PATCH /me and change-password', async () => {
    const user = await makeUser('staff');
    const me = await request(app).get('/api/auth/me').set('Authorization', user.auth);
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ id: user.id, role: 'staff' });

    const patched = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', user.auth)
      .send({ fullName: 'Renamed', role: 'admin' });
    expect(patched.body.data).toMatchObject({ fullName: 'Renamed', role: 'staff' });

    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', user.auth)
      .send({ password: 'weak' })
      .expect(400);
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', user.auth)
      .send({ password: 'Newpass!word' })
      .expect(200);
    expect(fakeAuth.admin.updateUserById).toHaveBeenCalledWith(user.id, { password: 'Newpass!word' });
  });

  it('rejects missing, invalid and deactivated tokens', async () => {
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope').expect(401);
    const ghost = await signToken('00000000-0000-4000-8000-000000000000');
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ghost}`).expect(401);
    const inactive = await makeUser('staff', { isActive: false });
    await request(app).get('/api/auth/me').set('Authorization', inactive.auth).expect(403);
  });
});
