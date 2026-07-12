"use client";

import { Fragment } from "react";

const STEPS = ["Store Details", "Vendor & Bank Details", "Products", "Review & Submit"];

export default function Stepper({ current }: { current: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const state =
          stepNum === current ? "active" : stepNum < current ? "done" : "pending";
        return (
          <Fragment key={label}>
            <div className="stepper-col">
              <span className={`stepper-node stepper-node-${state}`}>{stepNum}</span>
              <span className={`stepper-label stepper-label-${state}`}>{label}</span>
            </div>
            {stepNum < STEPS.length && <span className="stepper-line" />}
          </Fragment>
        );
      })}
    </div>
  );
}
