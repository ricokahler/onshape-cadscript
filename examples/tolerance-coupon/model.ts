import { defineModel, length, lengthParam, sketch } from "onshape-cadscript";

const clearances = [0.15, 0.2, 0.25, 0.3, 0.35];

export default defineModel({
  name: "tolerance-coupon",
  units: "mm",
  parameters: {
    nominalWidth: lengthParam(8, { description: "Nominal tab width" }),
    thickness: lengthParam(3),
  },
  async *build(cad, p) {
    const baseProfile = yield* cad.sketch({
      id: "base-profile",
      name: "Coupon outline",
      plane: cad.top,
      entities: [sketch.roundedRectangle("outline", [-45, -15], [45, 15], length(3))],
    });
    const base = yield* cad.extrude({ id: "base", profile: baseProfile, depth: p.thickness });
    const top = yield* cad.plane({ id: "top-plane", reference: cad.top, offset: p.thickness });
    const slots = yield* cad.sketch({
      id: "slot-profile",
      name: "Clearance slots",
      plane: { type: "plane", feature: top },
      entities: clearances.flatMap((clearance, index) => {
        const center = -32 + index * 16;
        const width = p.nominalWidth + clearance * 2;
        return [
          sketch.rectangle(`slot-${index}`, [center - width / 2, -7], [center + width / 2, 7]),
          sketch.text(`label-${index}`, clearance.toFixed(2), [center - 4, 10], length(2.5)),
        ];
      }),
    });
    yield* cad.extrude({
      id: "slots",
      profile: slots,
      depth: p.thickness,
      operation: "REMOVE",
      oppositeDirection: true,
      scope: cad.bodies(base),
    });
  },
});
