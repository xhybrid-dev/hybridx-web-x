import {Composition} from 'remotion';
import './fonts';
import {RenderTest} from './compositions/RenderTest';
import {FPS} from './data/sceneTimings';
import {layout} from './tokens';

export const Root = () => (
	<>
		{/* Gate 0: one second each, proves Chrome, fonts, images, tokens and encode work in this container. */}
		<Composition
			id="RenderTest"
			component={RenderTest}
			defaultProps={{aspect: 'landscape' as const}}
			durationInFrames={FPS}
			fps={FPS}
			width={layout.landscape.width}
			height={layout.landscape.height}
		/>
		<Composition
			id="RenderTestPortrait"
			component={RenderTest}
			defaultProps={{aspect: 'portrait' as const}}
			durationInFrames={FPS}
			fps={FPS}
			width={layout.portrait.width}
			height={layout.portrait.height}
		/>
	</>
);
