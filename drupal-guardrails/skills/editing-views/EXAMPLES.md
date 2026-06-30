# Editing Views — worked example

## Excluding a bundle from a Search API view (NYC-842)

Wrong (scalar value, string handler, non-canonical operator):
```yaml
plugin_id: search_api_string
operator: '<>'
value: faq
```

Correct (options handler because `node_bundle` is a bundle field):
```yaml
node_bundle:
  id: node_bundle
  table: search_api_index_content
  field: node_bundle
  relationship: none
  group_type: group
  admin_label: ''
  plugin_id: search_api_options
  operator: not
  value:
    faq: faq
  group: 1
  exposed: false
  expose:
    operator_id: ''
    label: ''
    description: ''
    use_operator: false
    operator: ''
    operator_limit_selection: false
    operator_list: {  }
    identifier: ''
    required: false
    remember: false
    multiple: false
    remember_roles:
      authenticated: authenticated
    reduce: false
  is_grouped: false
  group_info:
    label: ''
    description: ''
    identifier: ''
    optional: true
    widget: select
    multiple: false
    remember: false
    default_group: All
    default_group_multiple: {  }
    group_items: {  }
  reduce_duplicates: false
```
