require 'aspace_logger'
class AspaceSimpleBulkEditItems
  
  include JSONModel
    
  attr_accessor :aspace_simple_bulk_edit_items
    
  def initialize(uris)
    @uris = uris
    @aspace_simple_bulk_edit_items = []
    build_aspace_simple_bulk_edit_items
  end

  def build_aspace_simple_bulk_edit_items
    @uris.each do | uri |
      if record_exists?(uri)
        build_aspace_simple_bulk_edit_item_for(uri)
      end
    end
  end

  def build_aspace_simple_bulk_edit_item_for(uri)

    bulk_edit_item = { "selected" => {"ref" => uri} }

    parsed = JSONModel.parse_reference(uri)
    bulk_edit_item[parsed[:type]] = { "ref" => uri }
    @aspace_simple_bulk_edit_items << bulk_edit_item
    
  end
  
  def record_exists?(uri)
    id = JSONModel.parse_reference(uri)[:id]
    type = JSONModel.parse_reference(uri)[:type]
    
    @model = find_model_by_json_model_type(type)

    id && !@model[id].nil?
  end

  private
  
  def find_model_by_json_model_type(type)
      ASModel.all_models.find {|model|
        jsonmodel = model.my_jsonmodel(true)
        jsonmodel && jsonmodel.record_type == type
      }
  end

end
