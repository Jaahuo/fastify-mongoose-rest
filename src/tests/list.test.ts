import {SuperAgentTest} from 'supertest';
import faker from 'faker';
import TestSetup from './util/setup';
import {CatModel, PersonModel} from './util/models';

describe(`list`, () => {
  const testSetup = new TestSetup();
  let request: SuperAgentTest;

  beforeEach(async () => {
    request = await testSetup.init();
  });

  afterEach(async () => {
    await testSetup.reset();
  });

  it('should get list of documents', async () => {
    const personCount = faker.datatype.number({min: 1, max: 10});
    for (let i = 0; i < personCount; i++) {
      await PersonModel.create({name: faker.name.findName()});
    }
    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(personCount);
      });
  });
  it('should get list of documents with skip and limit', async () => {
    for (let i = 0; i <= 2; i++) {
      await PersonModel.create({name: faker.name.findName()});
    }
    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({skip: 1, limit: 5})
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(2);
      });
  });
  it('should get list of documents with filter', async () => {
    const person = await PersonModel.create({name: 'asd'});
    await PersonModel.create({name: 'qwe'});

    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({query: JSON.stringify({name: 'asd'})})
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(1);
        expect(body[0].name).toEqual(person.name);
      });
  });
  it('should populate list elements', async () => {
    const catCount = faker.datatype.number({min: 1, max: 10});
    const cats = [];
    for (let i = 0; i < catCount; i++) {
      const {_id} = await CatModel.create({
        name: faker.name.findName(),
        age: faker.datatype.number({min: 1, max: 20}),
      });
      cats.push(_id);
    }
    await PersonModel.create({name: 'asd', cats});
    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({populate: 'cats'})
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(1);
        expect(Array.isArray(body[0].cats)).toEqual(true);
        expect(body[0].cats.length).toEqual(catCount);
      });
  });

  it('should sort list documents', async () => {
    await PersonModel.create({name: 'a'});
    await PersonModel.create({name: 'b'});
    await PersonModel.create({name: 'c'});

    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({sort: 'name'})
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(3);
        expect(body[0].name).toEqual('a');
        expect(body[1].name).toEqual('b');
        expect(body[2].name).toEqual('c');
      });
    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({sort: '-name'})
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(3);
        expect(body[2].name).toEqual('a');
        expect(body[1].name).toEqual('b');
        expect(body[0].name).toEqual('c');
      });
  });

  it('should return header X-Total-Count with total count of documents', async () => {
    for (let i = 0; i < 10; i++) {
      await PersonModel.create({name: faker.name.findName()});
    }
    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({skip: 0, limit: 5})
      .then(({body, header}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(5);
        expect(header['x-total-count']).toEqual('10');
      });
  });

  it('should return only properties defined in projection', async () => {
    await PersonModel.create({name: faker.name.findName()});
    await request
      .get('/persons')
      .expect(200)
      .expect('Content-Type', /json/)
      .query({
        projection: 'name -_id',
      })
      .then(({body}) => {
        expect(Array.isArray(body)).toEqual(true);
        expect(body.length).toEqual(1);
        expect(body[0]).toHaveProperty('name');
        expect(body[0]).not.toHaveProperty('_id');
      });
  });
});
