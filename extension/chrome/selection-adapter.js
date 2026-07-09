(function () {
  window.addEventListener("__cadscript_get_selection", (event) => {
    let detail;
    try {
      const root =
        document.querySelector("[ng-app]") || document.querySelector(".ng-scope") || document.body;
      const injector = window.angular?.element(root).injector();
      const service = injector?.get("SelectionService");
      const selections = service?.constructor.getCurrentSelections() || [];
      detail = {
        ok: true,
        selections: selections.map((selection) => {
          const metadata = selection.entityMetaData || {};
          return {
            type: selection.type,
            selectionId: selection.selectionId,
            name: selection.name,
            featureType: selection.featureType,
            idString: selection.getIdString?.() || null,
            entityType: selection.getType?.() || null,
            featureIds: metadata.featureIds || [],
            deterministicId: metadata.deterministicId || null,
          };
        }),
      };
    } catch (error) {
      detail = { ok: false, error: error.message };
    }
    window.dispatchEvent(
      new CustomEvent(`__cadscript_selection_result_${event.detail.id}`, { detail }),
    );
  });
})();
