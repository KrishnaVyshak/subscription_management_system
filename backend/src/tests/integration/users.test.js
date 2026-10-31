import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { fakeAuth } from '../helpers/fakeSupabase.js';

const app = createApp();

describeDb('users (admin only)', () => {
  useDb();

  it('lists users for the admin, 403 for staff and customers', async () => {
    const admin = await makeUser('admin');
    const staff = await makeUser('staff');
    const customer = await makeUser('customer');

    const res = await request(app).get('/api/users?role=staff').set('Authorization', admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 25, total: 1 });
    expect(res.body.data[0]).toMatchObject({ id: staff.id, role: 'staff' });

    await request(app).get('/api/users').set('Authorization', staff.auth).expect(403);
    await request(app).get('/api/users').set('Authorization', customer.auth).expect(403);
    await request(app).get('/api/users?sort=password').set('Authorization', admin.auth).expect(400);
  });

  it('creates staff and sends the password-setup email', async () => {
    const admin = await makeUser('admin');
    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', admin.auth)
      .send({ email: 'Sam@Brightloop.test', fullName: 'Sam', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'sam@brightloop.test', role: 'staff' });
    expect(fakeAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'sam@brightloop.test',
      expect.objectContaining({ redirectTo: expect.stringMatching(/\/reset-password$/) }),
    );
    await request(app)
      .post('/api/users/staff')
      .set('Authorization', admin.auth)
      .send({ email: 'sam@brightloop.test', fullName: 'Sam' })
      .expect(409);
  });

  it('updates users but never deactivates yourself', async () => {
    const admin = await makeUser('admin');
    const staff = await makeUser('staff');
    const res = await request(app)
      .patch(`/api/users/${staff.id}`)
      .set('Authorization', admin.auth)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    const self = await request(app)
      .patch(`/api/users/${admin.id}`)
      .set('Authorization', admin.auth)
      .send({ isActive: false });
    expect(self.status).toBe(422);
    expect(self.body.error.details.rule).toBe('CANNOT_DEACTIVATE_SELF');
  });
});
