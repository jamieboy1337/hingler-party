import { GameContext } from "../../GameContext";
import { GLTFScene } from "../../loaders/GLTFScene";
import { RenderContext, RenderPass } from "../../render/RenderContext";
import { PBRModel } from "../../model/PBRModel";
import { GameObject } from "./GameObject";
import { Model } from "../../model/Model";
import { Future } from "../../../../../ts/util/task/Future";
import { RenderType } from "../../internal/performanceanalytics";
import { ComponentType } from "../../component/ComponentType";

export class GamePBRModel extends GameObject {
  private model_: PBRModel;

  constructor(ctx: GameContext, init: PBRModel | Future<PBRModel>) {
    super(ctx);
    this.addComponent(ComponentType.MODEL);
    this.model_ = null;
    if (init instanceof PBRModel) {
      this.model = init;
    } else {
      if (init.valid()) {
        this.model = init.get();
      } else {
        init.wait().then((res: PBRModel) => {
          this.model = res;
        });
      }
    }
  }

  private updateDebugName() {
    if (this.model_ !== null && this.model_.name !== undefined && this.model_.name.length > 0) {
      this.setDebugName(this.model_.name);
    }
  }

  set model(model: PBRModel) {
    this.model_ = model;
    const mod = this.getComponent(ComponentType.MODEL);
    mod.model = model;
    this.updateDebugName();
  }

  get model() {
    return this.model_;
  }

  setPBRModel(model: PBRModel | Future<PBRModel>) {
    if (model instanceof PBRModel) {
      this.model = model;
    } else {
      if (model.valid()) {
        console.log(model.get());
        this.model = model.get();
      } else {
        model.wait().then((res: PBRModel) => {
          this.model = res;
        });
      }
    }

    
  }

  renderMaterial(rc: RenderContext) {
    const timer = this.getContext().getGPUTimer();
    const id = timer.startQuery();
    if (this.model_ !== null) {
      
      let modelMat = this.getTransformationMatrix();
      if (rc.getRenderPass() === RenderPass.SHADOW) {
        this.model_.drawPBRShadow(modelMat, rc);
        timer.stopQueryAndLog(id, `${this.getDebugName()}.PBRShadow`, RenderType.SHADOW);
      } else {
        this.model_.drawPBR(modelMat, rc);
        timer.stopQueryAndLog(id, `${this.getDebugName()}.PBRMaterial`, RenderType.FINAL);
      }
    }
  }
}