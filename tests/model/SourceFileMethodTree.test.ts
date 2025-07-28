import {
	GlobalIndex,
	SourceFileMetaData,
	NodeModule,
	UnifiedPath_string,
	SourceNodeMetaDataType,
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core'

import { SourceFileMethodTree } from '../../src/model/SourceFileMethodTree'

/*
This test describes this code:

class Test {
	upsert(x: number) {
		let test = function () {
			console.log('test default')
		}
		if (x > 0) {
			test = function () {
				console.log('test')
			}
		} else {
			test = function () {
				console.log('test else')
			}
		}
	}
}

*/

const globalIndex = new GlobalIndex(NodeModule.currentEngineModule())
const moduleIndex = globalIndex.getModuleIndex('upsert')
const pathIndex = moduleIndex.getFilePathIndex(
	'upsert',
	'test.ts' as UnifiedPath_string
)
const sourceFileMetaData = new SourceFileMetaData(
	'test.ts' as UnifiedPath_string,
	pathIndex
)

// should not be included in the tree since no source node metadata is created for it
pathIndex.getSourceNodeIndex(
	'upsert',
	'{root}.{class:Test}.{method:upsert}.{functionExpression:test2}' as SourceNodeIdentifier_string
)

const sourceNodeMetaData1 = sourceFileMetaData.createOrGetSourceNodeMetaData(
	'{root}.{class:Test}.{method:upsert}.{functionExpression:test}' as SourceNodeIdentifier_string,
	SourceNodeMetaDataType.SourceNode
)

const sourceNodeMetaData2 = sourceFileMetaData.createOrGetSourceNodeMetaData(
	'{root}.{class:Test}.{method:upsert}.{scope:(if:0)}.{scope:(then)}.{functionExpression:(anonymous:0)}' as SourceNodeIdentifier_string,
	SourceNodeMetaDataType.SourceNode
)
sourceNodeMetaData2.presentInOriginalSourceCode = false

const sourceNodeMetaData3 = sourceFileMetaData.createOrGetSourceNodeMetaData(
	'{root}.{class:Test}.{method:upsert}.{scope:(if:0)}.{scope:(else)}.{functionExpression:(anonymous:0)}' as SourceNodeIdentifier_string,
	SourceNodeMetaDataType.SourceNode
)

describe('SourceFileMethodThree', () => {
	test('should create the correct tree with all nodes', () => {
		const instance = SourceFileMethodTree.fromSourceFileMetaData(sourceFileMetaData)

		expect(instance.toJSON()).toEqual({
			pioscChildrenCount: 1,
			sourceNodeMetaData: undefined,
			children: {
				'{root}': {
					pioscChildrenCount: 1,
					piosc: true,
					sourceNodeMetaData: undefined,
					children: {
						'{class:Test}': {
							pioscChildrenCount: 1,
							piosc: true,
							sourceNodeMetaData: undefined,
							children: {
								'{method:upsert}': {
									pioscChildrenCount: 2,
									piosc: true,
									sourceNodeMetaData: undefined,
									children: {
										'{functionExpression:test}': {
											pioscChildrenCount: 0,
											piosc: true,
											sourceNodeMetaData: sourceNodeMetaData1.toJSON(),
											children: {}
										},
										'{scope:(if:0)}': {
											pioscChildrenCount: 1,
											sourceNodeMetaData: undefined,
											piosc: true,
											children: {
												'{scope:(then)}': {
													pioscChildrenCount: 0,
													children: {
														'{functionExpression:(anonymous:0)}': {
															pioscChildrenCount: 0,
															sourceNodeMetaData: sourceNodeMetaData2.toJSON(),
															children: {}
														}
													}
												},
												'{scope:(else)}': {
													piosc: true,
													pioscChildrenCount: 1,
													children: {
														'{functionExpression:(anonymous:0)}': {
															piosc: true,
															pioscChildrenCount: 0,
															sourceNodeMetaData: sourceNodeMetaData3.toJSON(),
															children: {}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		})
	})
})
