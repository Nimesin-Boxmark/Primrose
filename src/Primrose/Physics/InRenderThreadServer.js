import CANNON from "cannon";

import BaseServerPlugin from "./BaseServerPlugin";

import EngineServer from "./EngineServer";

const data = [],
  evt = { type: "message", data };

export default class InRenderThreadServer extends BaseServerPlugin {

  constructor() {
    super();
    this._engine = new EngineServer();
  }

  preUpdate(env, dt) {
    super.preUpdate(env, dt);
    this._engine.update(dt);
    for(let n = 0; n < this._engine.bodyIDs.length; ++n) {
      const id = this._engine.bodyIDs[n],
        body = this._engine.bodyDB[id],
        ent = env.entities.get(id);

      if(body && ent && body.sleepState !== CANNON.Body.SLEEPING) {
        ent.position.copy(body.position);
        ent.quaternion.copy(body.quaternion);
        ent.velocity.copy(body.velocity);
        ent.angularVelocity.copy(body.angularVelocity);
        ent.updateMatrix();
        ent.commit();
      }
    }
  }

  setGravity(v) {
    this._engine.setGravity(v);
  }

  setAllowSleep(v) {
    this._engine.setAllowSleep(v);
  }

  newBody(id, mass, type) {
    this._engine.newBody(id, mass, type);
  }

  addSphere(id, radius) {
    this._engine.addSphere(id, radius);
  }

  addBox(id, width, height, depth) {
    this._engine.addBox(id, width, height, depth);
  }

  addPlane(id) {
    this._engine.addPlane(id);
  }

  setPosition(id, x, y, z) {
    this._engine.setPosition(id, x, y, z);
  }

  setQuaternion(id, x, y, z, w) {
    this._engine.setQuaternion(id, x, y, z, w);
  }

  setVelocity(id, x, y, z) {
    this._engine.setVelocity(id, x, y, z);
  }

  setAngularVelocity(id, x, y, z) {
    this._engine.setAngularVelocity(id, x, y, z);
  };

  setLinearDamping(id, v) {
    this._engine.setLinearDamping(id, v);
  }

  setAngularDamping(id, v) {
    this._engine.setAngularDamping(id, v);
  }
}