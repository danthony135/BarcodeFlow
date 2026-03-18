import { browser } from '$app/environment';

export function isMobileDevice(): boolean {
	if (!browser) return false;
	// Check for touch capability + mobile user agent
	const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	const mobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);
	// iPads report as Mac in newer iOS, but have touch
	const isIPad = navigator.userAgent.includes('Mac') && hasTouchScreen && navigator.maxTouchPoints > 1;
	return mobileUA || isIPad;
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
	if (!browser) return 'desktop';
	const ua = navigator.userAgent;
	const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	if (/iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile/i.test(ua)) return 'mobile';
	if (/iPad|Android(?!.*Mobile)|tablet/i.test(ua) || (ua.includes('Mac') && hasTouchScreen && navigator.maxTouchPoints > 1)) return 'tablet';
	return 'desktop';
}
