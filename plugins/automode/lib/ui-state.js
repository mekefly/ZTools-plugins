(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.autoModeUiState = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function shouldDisableScheduleInputs(state) {
    return !!state && state.currentMode === 'schedule' && !!state.scheduleEnabled;
  }

  function hasThemeStateChanged(state) {
    if (!state) {
      return false;
    }
    return state.previousIsDark !== !!state.detectedIsDark;
  }

  function canEnableSunMode(state) {
    return !!state && !!state.selectedLocation && !!state.sunTimesReady && !state.sunFetchError;
  }

  function shouldShowSearchEmpty(state) {
    return !!state &&
      (state.query || '').trim().length >= 2 &&
      !state.loading &&
      !state.error &&
      Array.isArray(state.results) &&
      state.results.length === 0;
  }

  function shouldShowSearchError(state) {
    return !!state &&
      (state.query || '').trim().length >= 2 &&
      !state.loading &&
      !!state.error;
  }

  return {
    shouldDisableScheduleInputs: shouldDisableScheduleInputs,
    hasThemeStateChanged: hasThemeStateChanged,
    canEnableSunMode: canEnableSunMode,
    shouldShowSearchEmpty: shouldShowSearchEmpty,
    shouldShowSearchError: shouldShowSearchError
  };
}));
