export const lightQuestionnaireHaptic = async () => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (_error) {
    // Web / plugin indisponible
  }
};
