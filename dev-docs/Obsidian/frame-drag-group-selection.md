# Frame dragging and repeated group selection

The normal-frame drag preview calls `getElementsInResizingFrame()` on pointer
movement, which calls `selectGroupsFromGivenElements()`. The selector previously
called `selectGroup()` for every candidate element, including members of a group
it had already selected. Each call rescans the candidates and copies the selected
element map. Large groups therefore cause quadratic work, not an exponential or
other non-polynomial algorithm.

The five-line fingerprinted guard in `packages/element/src/groups.ts` skips a
group whose entry is already exactly `true` in this call's result. The elements
are unchanged during the synchronous selection pass, so its members have already
been accounted for. There is no persistent cache, pointer throttling, delayed
membership update or changed scene data. Selection order, singleton handling and
the current editing-group rules remain in the original implementation. With a
fixed number of groups this removes the quadratic repetition; other full-scene
scans and worst cases with many distinct groups are outside this patch.

This belongs in the component's internal drag path and is generally useful
upstream. The relevant original selector is identical in fork checkpoint
`5516b06fc` and its incoming upstream parent
`d732d4f3d50e6ac092ec6e86a4e04a40546a9395`. The local branch is
`fix/frame-drag-group-selection`. Upstream contribution, publication and version
changes were initially deferred pending maintainer confirmation. The maintainer
has now confirmed improved performance and authorized the fork merge and a
separate upstream PR. Package publication and version changes remain deferred.

## Evidence

- Four retained source regressions cover bounded work for four large groups,
  nested/editing groups, singleton/ungrouped elements, partial enclosure and
  marker frames. The work-budget case fails before the patch with 167,200 group
  reads for 400 elements and passes afterward.
- A private, ignored benchmark uses the supplied drawing: 1,495 elements in five
  top-level groups, with 635, 263, 213, 191 and 190 members. Group reads fall from
  2,232,035 to 8,970. Two local measurements give approximately 465/728 ms before
  and 1.6/2.0 ms afterward. These are selector timings, not entire gesture/frame
  timings; machine contention affects the numbers. A separate 401-case comparison
  retains the original selector's output for the drawing and generated nested
  editing-group configurations.
- The regression/coverage suite passes 182 cases. Full and owned typechecks,
  focused lint, ESM/Obsidian builds and the isolated packed consumer pass. The browser
  suite passes 28 cases with zero browser errors and successful cleanup.
- Fresh baseline and fixed components are copied as four artifacts into the
  plugin's installed package, followed by a plugin build and explicit deployment
  to the maintainer-requested `excalidraw-test` vault. Installed artifact hashes,
  settings preservation and enabled-plugin preservation are recorded under the
  plugin's ignored `.test-work/frame-drag/deploy-*` directories.
  The final rebuilt component artifacts are byte-identical to the copies used by
  the deployed plugin. Its `main.js` is 5,160,896 bytes (81,984 bytes below 5 MiB).
- Trusted main-window drags on a temporary copy of the supplied drawing capture
  all 1,495 elements in an ordinary frame. Undo releases them; redo restores them.
  A marker frame captures none. OS drag automation emits a single coalesced move,
  so it does not establish sustained-drag latency. The original drawing is not
  used for destructive frame tests. Backups and native results remain ignored.
  Cleanup restores the original drawing byte-for-byte, removes the diagnostic
  copy/controller and reopens the original drawing for maintainer confirmation.

The first benchmark hit the default five-second test timeout; its output is
retained and the benchmark-only timeout is raised for the successful rerun.
Source test fixture type errors were corrected, and lint uses the JSON formatter
because the installed stylish formatter fails to load. The package lane must
build ESM **before** Obsidian, since ESM clears the package's dist directory.

The historical inventory comparison remains pinned to `82190fb28`. This checkpoint
adds only the reviewed selector/test rows. It does not bless the 22 unrelated
drift items already present after newer upstream/release changes; the overall
inventory check remains incomplete until those changes receive their own review.

## Remaining confirmation

The most likely regression would be shared group-selection semantics during
ordinary selection or while editing nested groups. Repeat slow normal-frame
creation across the supplied groups and resize across group boundaries; compare
highlighting, final membership and undo/redo. Repeat with markers and in a popout.
The maintainer should confirm subjective smoothness under their usual background
load. Physical mobile, other desktop platforms and the complete plugin native
acceptance profile are not established by these focused main-window checks.

The maintainer confirmed the sustained-drag improvement after this checkpoint.
The upstream PR will carry only the generic selector guard and focused tests.
