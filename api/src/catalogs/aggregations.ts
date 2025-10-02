// Catalogs with count of imports and publications
export const catalogsWithCounts = (queryWithFilters: Record<string, any>, sort: any, skip: number, size: number, project: Record<string, any>) => {
  return [
    { $match: queryWithFilters },
    {
      $lookup: {
        from: 'imports',
        localField: '_id',
        foreignField: 'catalog.id',
        as: 'imports'
      }
    },
    {
      $lookup: {
        from: 'publications',
        localField: '_id',
        foreignField: 'catalog.id',
        as: 'publications'
      }
    },
    {
      $addFields: {
        importsCount: { $size: '$imports' },
        publicationsCount: { $size: '$publications' }
      }
    },
    {
      $project: {
        imports: 0,
        publications: 0,
      }
    },
    ...(Object.keys(project).length > 0 ? [{ $project: project }] : []),
    { $sort: sort },
    { $skip: skip },
    { $limit: size }
  ]
}

export const catalogFacets = (query: Record<string, any>, showAll: boolean) => {
  const aggregationPipeline = [
    {
      $facet: {
        plugins: [
          {
            $group: {
              _id: '$plugin',
              count: { $sum: 1 }
            }
          }
        ]
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          plugins: { $arrayToObject: { $map: { input: '$plugins', as: 'el', in: { k: '$$el._id', v: '$$el.count' } } } }
        }
      }
    }
  ] as any[]

  if (showAll) {
    aggregationPipeline[0].$facet.owners = [
      {
        $group: {
          _id: {
            type: '$owner.type',
            id: '$owner.id',
            name: '$owner.name',
            department: { $ifNull: ['$owner.department', null] },
            departmentName: { $ifNull: ['$owner.departmentName', null] }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          count: 1,
          value: {
            type: '$_id.type',
            id: '$_id.id',
            name: '$_id.name',
            department: '$_id.department',
            departmentName: '$_id.departmentName'
          }
        }
      },
      {
        $group: {
          _id: {
            type: '$value.type',
            id: '$value.id',
            name: '$value.name'
          },
          count: { $sum: '$count' },
          departments: {
            $push: {
              department: '$value.department',
              departmentName: '$value.departmentName',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          id: '$_id.id',
          name: '$_id.name',
          count: 1,
          departments: {
            $filter: {
              input: '$departments',
              as: 'dept',
              cond: { $ne: ['$$dept.department', null] } // Filter null departments
            }
          }
        }
      }
    ]
    aggregationPipeline[1].$replaceRoot.newRoot.owners = { $ifNull: ['$owners', []] }
  } else {
    aggregationPipeline.unshift({ $match: query })
  }

  return aggregationPipeline
}
