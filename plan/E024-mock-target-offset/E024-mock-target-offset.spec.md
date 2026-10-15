# E024 Specification

## Acceptance Criteria
R1–R8 are normative in the companion plan: snapshot identity, immutable exclusive results, bounded validation, zero/one/multiple classification, current-center normalization, stateless determinism, independent common vectors and experimental evidence boundaries.
For 640x480: (280,200,80,80)->(0,0); (120,200,80,80)->(-.5,0); (440,200,80,80)->(.5,0); (280,80,80,80)->(0,-.5); (280,320,80,80)->(0,.5); (440,80,80,80)->(.5,-.5); (400,200,80,80)->(.375,0); (420,220,40,40)->(.375,0); (400.5,200,79,80)->(.375,0); (0,0,80,80)->(-.875,-5/6); (560,400,80,80)->(.875,5/6); (0,0,640,480)->(0,0).
For 1280x960: (800,400,160,160)->(.375,0). MAX square with full-frame int/float dimensions -> (0,0). abs tolerance=1e-12, rel=0. All outcomes preserve ID.

## Behavioral Scenarios
- Given a valid single-frame VO and one contained positive box, when calculate_offset runs, then Target contains the normalized current center and original ID.
- Given valid dimensions and no boxes, when calculating, then NoTarget, never Target(0,0).
- Given an invalid frame, multiple boxes or one invalid box, when calculating, then Rejected with invalid_frame, multiple_targets or invalid_box respectively, never a usable offset.
- Given the same nonzero snapshot repeatedly or interleaved with another observation, when calculating, then the same result each time without mutation or history.
- Given a future detector/tracker on adapter side, then only conforming self-owned VO reaches calculator; no real implementation or integration is included now.

## Error / Edge Cases
Frame native int excluding bool in 1..MAX; box native int/float excluding bool in -MAX..MAX, wh>0 and exact containment. Reject nonnumeric, NaN, Inf, oversized ints and floats before arithmetic. All four edges may touch but never exceed frame. Error handling is return classification, not repair/clamp or hidden no-target.
Observation ID is correlation for one snapshot, not cross-frame identity. TargetOffset is not prev-curr, angle or automatic centering. External new image->adapter->calculator->downstream rotation->reobserve owns stop tolerance, gain, motor signs and pose pairing. Independent decreasing Mock offsets do not establish tracking or Robot convergence. Real consumer/tracker/control remain unverified.
