export type ModelUnits = "mm" | "cm" | "m" | "in";

export type Point2 = readonly [x: number, y: number];
export type Point3 = readonly [x: number, y: number, z: number];

export type Length = number & { readonly __quantity: "length" };
export type Angle = number & { readonly __quantity: "angle" };

export type PlaneName = "Top" | "Front" | "Right";

export type EntityType = "BODY" | "FACE" | "EDGE" | "VERTEX";

export type FeatureKind =
  | "sketch"
  | "extrude"
  | "revolve"
  | "fillet"
  | "chamfer"
  | "boolean"
  | "plane"
  | "transform"
  | "shell"
  | "raw";

export interface FeatureRef<K extends FeatureKind = FeatureKind> {
  readonly type: "feature";
  readonly id: string;
  readonly kind: K;
}

export interface PlaneRef {
  readonly type: "plane";
  readonly name?: PlaneName;
  readonly feature?: FeatureRef<"plane">;
}

export type QueryRef =
  | { readonly type: "created-by"; readonly feature: FeatureRef; readonly entityType: EntityType }
  | {
      readonly type: "sketch-entity";
      readonly sketch: FeatureRef<"sketch">;
      readonly entityId: string;
      readonly entityType: EntityType;
    }
  | {
      readonly type: "cap";
      readonly feature: FeatureRef;
      readonly cap: "START" | "END";
      readonly entityType: "FACE" | "EDGE";
    }
  | { readonly type: "owned-by-body"; readonly body: QueryRef; readonly entityType: EntityType }
  | { readonly type: "geometry"; readonly query: QueryRef; readonly geometry: GeometryType }
  | { readonly type: "closest-to"; readonly query: QueryRef; readonly point: Point3 }
  | { readonly type: "raw"; readonly query: string };

export type GeometryType = "PLANE" | "CYLINDER" | "SPHERE" | "CONE" | "TORUS" | "CIRCLE" | "LINE";

export type SketchConstraint =
  | {
      readonly id: string;
      readonly type: "coincident";
      readonly first: string;
      readonly second: string;
    }
  | { readonly id: string; readonly type: "horizontal" | "vertical"; readonly entity: string }
  | {
      readonly id: string;
      readonly type: "equal" | "parallel" | "perpendicular";
      readonly first: string;
      readonly second: string;
    }
  | {
      readonly id: string;
      readonly type: "distance";
      readonly first: string;
      readonly second?: string;
      readonly value: Length;
    }
  | {
      readonly id: string;
      readonly type: "diameter";
      readonly entity: string;
      readonly value: Length;
    }
  | { readonly id: string; readonly type: "fix"; readonly entity: string };

export type SketchEntity =
  | {
      readonly type: "line";
      readonly id: string;
      readonly from: Point2;
      readonly to: Point2;
      readonly construction?: boolean;
    }
  | {
      readonly type: "circle";
      readonly id: string;
      readonly center: Point2;
      readonly radius: Length;
      readonly construction?: boolean;
    }
  | {
      readonly type: "arc";
      readonly id: string;
      readonly center: Point2;
      readonly radius: Length;
      readonly startAngle: Angle;
      readonly endAngle: Angle;
      readonly construction?: boolean;
    }
  | {
      readonly type: "rectangle";
      readonly id: string;
      readonly corner1: Point2;
      readonly corner2: Point2;
      readonly construction?: boolean;
    }
  | {
      readonly type: "roundedRectangle";
      readonly id: string;
      readonly corner1: Point2;
      readonly corner2: Point2;
      readonly radius: Length;
    }
  | {
      readonly type: "bezier";
      readonly id: string;
      readonly points: readonly Point2[];
      readonly closed?: boolean;
      readonly construction?: boolean;
    }
  | {
      readonly type: "point";
      readonly id: string;
      readonly point: Point2;
      readonly construction?: boolean;
    }
  | {
      readonly type: "text";
      readonly id: string;
      readonly text: string;
      readonly baselineStart: Point2;
      readonly ascent: Length;
      readonly fontName?: string;
      readonly baselineDirection?: Point2;
    }
  | {
      readonly type: "svg";
      readonly id: string;
      readonly source: string;
      readonly scale?: number;
      readonly translate?: Point2;
    };

export interface FeatureBase<K extends FeatureKind> {
  readonly kind: K;
  readonly id: string;
  readonly name?: string;
}

export interface SketchFeature extends FeatureBase<"sketch"> {
  readonly plane: PlaneRef;
  readonly entities: readonly SketchEntity[];
  readonly constraints: readonly SketchConstraint[];
}

export interface ExtrudeFeature extends FeatureBase<"extrude"> {
  readonly profile: FeatureRef<"sketch"> | QueryRef;
  readonly depth?: Length;
  readonly operation: "NEW" | "ADD" | "REMOVE";
  readonly bodyType: "SOLID" | "SURFACE";
  readonly endBound: "BLIND" | "SYMMETRIC" | "THROUGH_ALL";
  readonly oppositeDirection?: boolean;
  readonly secondDirectionDepth?: Length;
  readonly scope?: QueryRef;
}

export interface RevolveFeature extends FeatureBase<"revolve"> {
  readonly profile: FeatureRef<"sketch">;
  readonly axis: QueryRef;
  readonly angle?: Angle;
  readonly revolveType: "FULL" | "ONE_DIRECTION" | "SYMMETRIC";
  readonly operation: "NEW" | "ADD" | "REMOVE";
}

export interface FilletFeature extends FeatureBase<"fillet"> {
  readonly edges: QueryRef;
  readonly radius: Length;
}

export interface ChamferFeature extends FeatureBase<"chamfer"> {
  readonly edges: QueryRef;
  readonly width: Length;
}

export interface BooleanFeature extends FeatureBase<"boolean"> {
  readonly operation: "UNION" | "SUBTRACTION" | "INTERSECTION";
  readonly tools: readonly QueryRef[];
  readonly targets?: readonly QueryRef[];
}

export interface PlaneFeature extends FeatureBase<"plane"> {
  readonly reference: PlaneRef | QueryRef;
  readonly offset: Length;
  readonly oppositeDirection?: boolean;
}

export interface TransformFeature extends FeatureBase<"transform"> {
  readonly bodies: readonly QueryRef[];
  readonly translation: Point3;
  readonly makeCopy?: boolean;
}

export interface ShellFeature extends FeatureBase<"shell"> {
  readonly faces?: readonly QueryRef[];
  readonly parts?: readonly QueryRef[];
  readonly thickness: Length;
  readonly hollow?: boolean;
  readonly oppositeDirection?: boolean;
}

export interface RawFeature extends FeatureBase<"raw"> {
  readonly featureType: string;
  readonly parameters: readonly Record<string, unknown>[];
}

export type FeatureNode =
  | SketchFeature
  | ExtrudeFeature
  | RevolveFeature
  | FilletFeature
  | ChamferFeature
  | BooleanFeature
  | PlaneFeature
  | TransformFeature
  | ShellFeature
  | RawFeature;

export type FeatureGenerator<K extends FeatureKind> = AsyncGenerator<
  FeatureNode,
  FeatureRef<K>,
  void
>;

export interface ParameterSpec<T> {
  readonly kind: "length" | "number" | "boolean" | "choice";
  readonly default: T;
  readonly description?: string;
  readonly min?: T;
  readonly max?: T;
  readonly choices?: readonly T[];
}

export type ParameterSpecs = Record<string, ParameterSpec<unknown>>;
export type ParameterValues<P extends ParameterSpecs> = { [K in keyof P]: P[K]["default"] };

export interface ModelDefinition<P extends ParameterSpecs = ParameterSpecs> {
  readonly name: string;
  readonly units: ModelUnits;
  readonly parameters: P;
  readonly build: (
    cad: Cad,
    parameters: ParameterValues<P>,
  ) => AsyncGenerator<FeatureNode, void, void>;
}

export interface MaterializedModel {
  readonly name: string;
  readonly units: ModelUnits;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly features: readonly FeatureNode[];
}

export interface Cad {
  readonly top: PlaneRef;
  readonly front: PlaneRef;
  readonly right: PlaneRef;
  sketch(
    options: Omit<SketchFeature, "kind" | "constraints"> & {
      readonly constraints?: readonly SketchConstraint[];
    },
  ): FeatureGenerator<"sketch">;
  extrude(
    options: Omit<ExtrudeFeature, "kind" | "operation" | "bodyType" | "endBound"> &
      Partial<Pick<ExtrudeFeature, "operation" | "bodyType" | "endBound">>,
  ): FeatureGenerator<"extrude">;
  revolve(
    options: Omit<RevolveFeature, "kind" | "operation" | "revolveType"> &
      Partial<Pick<RevolveFeature, "operation" | "revolveType">>,
  ): FeatureGenerator<"revolve">;
  fillet(options: Omit<FilletFeature, "kind">): FeatureGenerator<"fillet">;
  chamfer(options: Omit<ChamferFeature, "kind">): FeatureGenerator<"chamfer">;
  boolean(options: Omit<BooleanFeature, "kind">): FeatureGenerator<"boolean">;
  plane(options: Omit<PlaneFeature, "kind">): FeatureGenerator<"plane">;
  transform(options: Omit<TransformFeature, "kind">): FeatureGenerator<"transform">;
  shell(options: Omit<ShellFeature, "kind">): FeatureGenerator<"shell">;
  rawFeature(options: Omit<RawFeature, "kind">): FeatureGenerator<"raw">;
  bodies(feature: FeatureRef): QueryRef;
  faces(feature: FeatureRef): QueryRef;
  edges(feature: FeatureRef): QueryRef;
  vertices(feature: FeatureRef): QueryRef;
  sketchEntity(sketch: FeatureRef<"sketch">, entityId: string, entityType?: EntityType): QueryRef;
  cap(feature: FeatureRef, cap: "START" | "END", entityType?: "FACE" | "EDGE"): QueryRef;
  ownedByBody(body: QueryRef, entityType: EntityType): QueryRef;
  geometry(query: QueryRef, geometry: GeometryType): QueryRef;
  closestTo(query: QueryRef, point: Point3): QueryRef;
  rawQuery(query: string): QueryRef;
}
